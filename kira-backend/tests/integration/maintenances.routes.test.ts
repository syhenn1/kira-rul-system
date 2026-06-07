/**
 * Representative coverage for /api/maintenances CRUD + /logs sub-resource —
 * smoke-tests the auth guard and main status-code branches with Prisma fully
 * mocked. Not exhaustive (this surface is large); see the plan for rationale.
 */
import request from 'supertest';

import { prismaMock } from '../helpers/prismaMock';
import { app } from '../../src/index';
import { testUser } from '../helpers/fixtures';
import { authHeader } from '../helpers/authToken';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}));

const auth = () => authHeader({ id: testUser.id, email: testUser.email });

describe('GET /api/maintenances', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/maintenances');
    expect(res.status).toBe(401);
  });

  it('returns paginated structure with default page/limit on success', async () => {
    prismaMock.maintenance.count.mockResolvedValue(0);
    prismaMock.maintenance.findMany.mockResolvedValue([] as any);

    const res = await request(app).get('/api/maintenances').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 0 });
  });

  it('clamps limit to a maximum of 100', async () => {
    prismaMock.maintenance.count.mockResolvedValue(0);
    prismaMock.maintenance.findMany.mockResolvedValue([] as any);

    const res = await request(app).get('/api/maintenances?limit=500').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('returns 500 with details when the database query fails', async () => {
    prismaMock.maintenance.count.mockRejectedValue(new Error('connection terminated'));

    const res = await request(app).get('/api/maintenances').set('Authorization', auth());

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch maintenances');
  });
});

describe('POST /api/maintenances', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).post('/api/maintenances').send({ id_asset: 'asset-1', scheduled_date: '2026-06-01' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when id_asset or scheduled_date is missing', async () => {
    const res = await request(app).post('/api/maintenances').set('Authorization', auth()).send({ id_asset: 'asset-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('returns 404 when the asset is not accessible to the user', async () => {
    prismaMock.asset.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/maintenances').set('Authorization', auth())
      .send({ id_asset: 'asset-1', scheduled_date: '2026-06-01' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/asset not found/i);
  });
});

describe('PATCH /api/maintenances/:id', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).patch('/api/maintenances/m1').send({ status: 'Completed' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when the maintenance is not accessible to the user', async () => {
    prismaMock.maintenance.findFirst.mockResolvedValue(null);

    const res = await request(app).patch('/api/maintenances/m1').set('Authorization', auth()).send({ status: 'Completed' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found or inaccessible/i);
  });

  it('returns 400 when scheduled_date is provided but empty', async () => {
    prismaMock.maintenance.findFirst.mockResolvedValue({ id: 'm1', id_asset: 'asset-1', logs: [] } as any);

    const res = await request(app).patch('/api/maintenances/m1').set('Authorization', auth())
      .send({ scheduled_date: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scheduled_date cannot be empty/i);
  });
});

describe('DELETE /api/maintenances/:id', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(((cb: any) => cb(prismaMock)) as any);
  });

  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).delete('/api/maintenances/m1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when the maintenance is not accessible to the user', async () => {
    prismaMock.maintenance.findFirst.mockResolvedValue(null);

    const res = await request(app).delete('/api/maintenances/m1').set('Authorization', auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found or inaccessible/i);
  });

  it('cascades the delete across prediction history, logs, and the maintenance row', async () => {
    prismaMock.maintenance.findFirst.mockResolvedValue({ id: 'm1' } as any);
    prismaMock.assetPredictionHistory.deleteMany.mockResolvedValue({ count: 2 } as any);
    prismaMock.maintenanceLog.deleteMany.mockResolvedValue({ count: 3 } as any);
    prismaMock.maintenance.deleteMany.mockResolvedValue({ count: 1 } as any);

    const res = await request(app).delete('/api/maintenances/m1').set('Authorization', auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      predictionHistoryDeleted: 2,
      logsDeleted: 3,
      maintenancesDeleted: 1,
    });
  });
});

describe('POST /api/maintenances/:id/logs', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).post('/api/maintenances/m1/logs').send({ status: 'In Progress' });
    expect(res.status).toBe(401);
  });
});
