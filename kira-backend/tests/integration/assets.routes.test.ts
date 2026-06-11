/**
 * Representative coverage for /api/assets — not exhaustive (this CRUD surface
 * is large), but enough to guard the auth gate, pagination clamping, and the
 * AI-engine forwarding behavior in POST /api/assets (which calls /predict for
 * an initial RUL estimate, with a criticality-based fallback on failure).
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

const auth = () => authHeader({ id: testUser.id, email: testUser.email });

function mockFetchResponse(ok: boolean, status: number, jsonBody?: any) {
  return { ok, status, json: jest.fn().mockResolvedValue(jsonBody), text: jest.fn().mockResolvedValue('') } as any;
}

describe('GET /api/assets', () => {
  beforeEach(() => {
    prismaMock.asset.findMany.mockResolvedValue([] as any);
    prismaMock.asset.groupBy.mockResolvedValue([] as any);
  });

  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(401);
  });

  it('returns paginated structure with default page/limit on success', async () => {
    const res = await request(app).get('/api/assets').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('stats');
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  it('clamps limit to a maximum of 100', async () => {
    const res = await request(app).get('/api/assets?limit=9999').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('clamps an invalid/negative page number up to 1', async () => {
    const res = await request(app).get('/api/assets?page=-5').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it('falls back to limit=10 when the limit query param is non-numeric', async () => {
    const res = await request(app).get('/api/assets?limit=not-a-number').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(10);
  });

  it('returns every matching asset, unpaginated, when limit=all', async () => {
    prismaMock.asset.findMany.mockResolvedValue(
      Array.from({ length: 150 }, (_, i) => ({
        id: `asset-${i}`,
        asset_name: `Asset ${i}`,
        gedung: null,
        merk: null,
        kategori: null,
        subKategori: null,
        tipe: null,
        prediction_history: [],
        maintenances: [],
      })) as any,
    );

    const res = await request(app).get('/api/assets?limit=all').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(150);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 150, total: 150, totalPages: 1 });
  });

  it('returns 500 with details when the database query fails', async () => {
    prismaMock.asset.findMany.mockRejectedValue(new Error('connection terminated'));

    const res = await request(app).get('/api/assets').set('Authorization', auth());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch assets');
  });
});

describe('POST /api/assets', () => {
  let fetchSpy: jest.SpiedFunction<typeof global.fetch>;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    prismaMock.merk.findUnique.mockResolvedValue(null);
    prismaMock.kategori.findUnique.mockResolvedValue(null);
    prismaMock.subKategori.findUnique.mockResolvedValue(null);
    prismaMock.tipe.findUnique.mockResolvedValue(null);
    prismaMock.asset.create.mockResolvedValue({ id: 'asset-1', asset_name: 'AC Split Lobby' } as any);
    prismaMock.assetPredictionHistory.create.mockResolvedValue({} as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).post('/api/assets').send({ asset_name: 'AC Split', purchase_date: '2026-01-01' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields (asset_name/purchase_date) are missing', async () => {
    const res = await request(app).post('/api/assets').set('Authorization', auth()).send({ asset_name: 'AC Split' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('returns 400 when the user does not belong to any company', async () => {
    prismaMock.company.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/assets').set('Authorization', auth())
      .send({ asset_name: 'AC Split Lobby', purchase_date: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong to any company/i);
  });

  it('uses the AI engine prediction when it responds successfully', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { predicted_rul: 420.7 }));

    const res = await request(app).post('/api/assets').set('Authorization', auth())
      .send({ asset_name: 'AC Split Lobby', purchase_date: '2026-01-01', criticality_level: 'Major' });

    expect(res.status).toBe(201);
    expect(res.body.data.predicted_rul).toBe(421); // Math.round(420.7)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/predict',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('falls back to the criticality-based RUL when the AI engine is unreachable', async () => {
    fetchSpy.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await request(app).post('/api/assets').set('Authorization', auth())
      .send({ asset_name: 'AC Split Lobby', purchase_date: '2026-01-01', criticality_level: 'Critical' });

    expect(res.status).toBe(201);
    expect(res.body.data.predicted_rul).toBe(90); // criticalityFallbackRUL['Critical']
  });

  it('falls back to the criticality-based RUL when the AI engine responds non-OK', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse(false, 503));

    const res = await request(app).post('/api/assets').set('Authorization', auth())
      .send({ asset_name: 'AC Split Lobby', purchase_date: '2026-01-01', criticality_level: 'Minor' });

    expect(res.status).toBe(201);
    expect(res.body.data.predicted_rul).toBe(365); // criticalityFallbackRUL['Minor']
  });

  it('does not fail asset creation when saving the prediction history throws', async () => {
    fetchSpy.mockResolvedValue(mockFetchResponse(true, 200, { predicted_rul: 300 }));
    prismaMock.assetPredictionHistory.create.mockRejectedValue(new Error('history insert failed'));

    const res = await request(app).post('/api/assets').set('Authorization', auth())
      .send({ asset_name: 'AC Split Lobby', purchase_date: '2026-01-01' });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/berhasil ditambahkan/i);
  });
});
