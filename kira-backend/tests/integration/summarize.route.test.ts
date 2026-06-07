/**
 * POST /api/summarize — backend-side of the NLP "generate" feature. Resolves
 * the authenticated user's company, forwards to the AI engine's /summarize,
 * and passes the result through. `global.fetch` is mocked via `jest.spyOn`;
 * Prisma is fully mocked (jest-mock-extended) — no real DB or AI engine call
 * is ever made.
 */
import request from 'supertest';

import { prismaMock } from '../helpers/prismaMock';
import { app } from '../../src/index';
import { testUser, testCompany } from '../helpers/fixtures';
import { authHeader } from '../helpers/authToken';

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

const auth = () => authHeader({ id: testUser.id, email: testUser.email });

describe('POST /api/summarize', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns 401 without a Bearer token (never reaches the AI engine)', async () => {
    const res = await request(app).post('/api/summarize').send({});

    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 404 when the authenticated user does not belong to any company', async () => {
    prismaMock.company.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/summarize').set('Authorization', auth()).send({});

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no company found/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the resolved company_id (NOT a client-supplied one) to the AI engine', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { summary: 'ok', assets: [] }));

    // Client tries to smuggle a different company_id — backend must ignore it
    // and use the one resolved server-side from the authenticated user.
    await request(app).post('/api/summarize').set('Authorization', auth())
      .send({ company_id: 'attacker-supplied-company-id', limit: 5 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:8000/summarize');
    const sentBody = JSON.parse((options as RequestInit).body as string);
    expect(sentBody.company_id).toBe(testCompany.id);
    expect(sentBody.company_id).not.toBe('attacker-supplied-company-id');
  });

  it('defaults limit to 10 and temperature to 0.2 when not provided', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { summary: 'ok', assets: [] }));

    await request(app).post('/api/summarize').set('Authorization', auth()).send({});

    const [, options] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse((options as RequestInit).body as string);
    expect(sentBody.limit).toBe(10);
    expect(sentBody.temperature).toBe(0.2);
  });

  it('passes through custom limit and temperature values', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { summary: 'ok', assets: [] }));

    await request(app).post('/api/summarize').set('Authorization', auth()).send({ limit: 25, temperature: 0.7 });

    const [, options] = fetchSpy.mock.calls[0];
    const sentBody = JSON.parse((options as RequestInit).body as string);
    expect(sentBody.limit).toBe(25);
    expect(sentBody.temperature).toBe(0.7);
  });

  it('passes through the summary and assets from the AI engine on success', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    const aiBody = {
      company_id: testCompany.id,
      summary: 'Sejumlah unit mekanikal memerlukan perhatian dalam waktu dekat.',
      assets: [{ id: 'a1', name: 'AC Split Lobby', pred_rul: 100 }],
    };
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, aiBody));

    const res = await request(app).post('/api/summarize').set('Authorization', auth()).send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(aiBody);
  });

  it('returns 500 when the AI engine responds non-2xx (e.g. all 4 LLM candidates failed upstream)', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    fetchSpy.mockResolvedValue(mockFetchResponse(false, 500, undefined, 'Summarization error: HF_TOKEN not set'));

    const res = await request(app).post('/api/summarize').set('Authorization', auth()).send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to summarize');
    expect(res.body.details).toMatch(/status 500/);
  });

  it('returns 500 when the AI engine call times out / connection is refused', async () => {
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    fetchSpy.mockRejectedValue(new Error('The operation was aborted due to timeout'));

    const res = await request(app).post('/api/summarize').set('Authorization', auth()).send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to summarize');
    expect(res.body.details).toMatch(/timeout/i);
  });
});
