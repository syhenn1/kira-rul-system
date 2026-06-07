/**
 * POST /api/predict-rul — thin forwarding proxy to the AI engine's /predict.
 * `global.fetch` is mocked via `jest.spyOn` so no real network call is made;
 * Prisma is mocked too even though this route doesn't touch it directly
 * (the app module wires up Prisma-backed routes at import time).
 */
import request from 'supertest';
import { app } from '../../src/index';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}));

function mockFetchResponse(ok: boolean, status: number, jsonBody?: any, textBody?: string) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(jsonBody),
    text: jest.fn().mockResolvedValue(textBody ?? ''),
  } as any;
}

describe('POST /api/predict-rul', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;
  const originalAiEngineUrl = process.env.AI_ENGINE_URL;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    process.env.AI_ENGINE_URL = originalAiEngineUrl;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    process.env.AI_ENGINE_URL = originalAiEngineUrl;
  });

  it('forwards the request body verbatim to {AI_ENGINE_URL}/predict and passes through the JSON response', async () => {
    const aiResponseBody = { status: 'success', predicted_rul: 365.0, model_type: 'pipeline' };
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, aiResponseBody));

    const payload = { merek: 'Sharp', kategori: 'Mechanical', count_nama_aset: 3 };
    const res = await request(app).post('/api/predict-rul').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(aiResponseBody);
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/predict',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
  });

  it('returns 500 with the AI engine status embedded when it responds non-2xx', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse(false, 503, undefined, 'Model belum dimuat'));

    const res = await request(app).post('/api/predict-rul').send({ merek: 'Sharp' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to predict RUL');
    expect(res.body.details).toMatch(/status 503/);
    expect(res.body.details).toMatch(/Model belum dimuat/);
  });

  it('returns 500 when the AI engine is unreachable (fetch rejects)', async () => {
    fetchSpy.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8000'));

    const res = await request(app).post('/api/predict-rul').send({ merek: 'Sharp' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to predict RUL');
    expect(res.body.details).toMatch(/ECONNREFUSED/);
  });

  it('strips a trailing slash from AI_ENGINE_URL before appending /predict', async () => {
    process.env.AI_ENGINE_URL = 'http://ai-engine:8000/';
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { predicted_rul: 100 }));

    await request(app).post('/api/predict-rul').send({ merek: 'Sharp' });

    expect(fetchSpy).toHaveBeenCalledWith('http://ai-engine:8000/predict', expect.anything());
  });

  it('falls back to http://localhost:8000 when AI_ENGINE_URL is unset', async () => {
    delete process.env.AI_ENGINE_URL;
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { predicted_rul: 100 }));

    await request(app).post('/api/predict-rul').send({ merek: 'Sharp' });

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8000/predict', expect.anything());
  });
});
