/**
 * Integration tests for /api/auth/* routes, hitting the real Express `app`
 * (exported from src/index.ts) via Supertest. Prisma is fully mocked via
 * `jest-mock-extended` (see src/lib/__mocks__/prisma.ts) — no real Postgres
 * connection is ever made. `bcryptjs` is mocked too, so tests are fast and
 * deterministic instead of paying real bcrypt salt-round costs.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';

import { prismaMock } from '../helpers/prismaMock';
import { app } from '../../src/index';
import { testUser, testCompany } from '../helpers/fixtures';
import { authHeader } from '../helpers/authToken';

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: require('../helpers/prismaMock').prismaMock,
}));
jest.mock('bcryptjs');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('POST /api/auth/register', () => {
  it('creates a new user, hashes the password, and returns a token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
    prismaMock.user.create.mockResolvedValue({ ...testUser, password: 'hashed-password' } as any);
    prismaMock.company.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: testUser.email, password: 'plainpassword123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user).not.toHaveProperty('password');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('plainpassword123', 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { name: 'Test User', email: testUser.email, password: 'hashed-password' },
    });
  });

  it('returns 409 when the email is already registered', async () => {
    prismaMock.user.findUnique.mockResolvedValue(testUser as any);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: testUser.email, password: 'pw',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns 400 when name, email, or password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('auto-joins the first existing company as a Member', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
    prismaMock.user.create.mockResolvedValue(testUser as any);
    prismaMock.company.findFirst.mockResolvedValue(testCompany as any);
    prismaMock.companyMember.create.mockResolvedValue({} as any);

    await request(app).post('/api/auth/register').send({
      name: 'Test User', email: testUser.email, password: 'plainpassword123',
    });

    expect(prismaMock.companyMember.create).toHaveBeenCalledWith({
      data: { id_user: testUser.id, id_perusahaan: testCompany.id, role: 'Member' },
    });
  });

  it('does not attempt to join a company when none exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
    prismaMock.user.create.mockResolvedValue(testUser as any);
    prismaMock.company.findFirst.mockResolvedValue(null);

    await request(app).post('/api/auth/register').send({
      name: 'Test User', email: testUser.email, password: 'plainpassword123',
    });

    expect(prismaMock.companyMember.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token and user payload for valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(testUser as any);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: 'correct-password',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('returns 401 for an incorrect password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(testUser as any);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for an email that is not registered', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com', password: 'whatever',
    });

    expect(res.status).toBe(401);
    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
  });

  it('returns 401 for a Google-only account with no password set, without calling bcrypt.compare', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...testUser, password: null } as any);

    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: 'whatever',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: testUser.email });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the profile without the raw pin, plus a has_pin=true flag when a pin is set', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...testUser, pin: 'hashed-pin-value' } as any);

    const res = await request(app).get('/api/auth/me')
      .set('Authorization', authHeader({ id: testUser.id, email: testUser.email }));

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('pin');
    expect(res.body.has_pin).toBe(true);
  });

  it('reports has_pin=false when no pin has been set', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...testUser, pin: null } as any);

    const res = await request(app).get('/api/auth/me')
      .set('Authorization', authHeader({ id: testUser.id, email: testUser.email }));

    expect(res.status).toBe(200);
    expect(res.body.has_pin).toBe(false);
  });

  it('returns 404 when the authenticated user no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/auth/me')
      .set('Authorization', authHeader({ id: 'ghost-user', email: 'ghost@example.com' }));

    expect(res.status).toBe(404);
  });
});

describe('POST /api/auth/set-pin', () => {
  const auth = () => authHeader({ id: testUser.id, email: testUser.email });

  it('rejects a PIN shorter than 6 digits', async () => {
    const res = await request(app).post('/api/auth/set-pin').set('Authorization', auth()).send({ pin: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 digit/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric PIN', async () => {
    const res = await request(app).post('/api/auth/set-pin').set('Authorization', auth()).send({ pin: 'abcdef' });

    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('hashes and stores a valid 6-digit numeric PIN', async () => {
    mockedBcrypt.hash.mockResolvedValue('hashed-pin' as never);
    prismaMock.user.update.mockResolvedValue({ ...testUser, pin: 'hashed-pin' } as any);

    const res = await request(app).post('/api/auth/set-pin').set('Authorization', auth()).send({ pin: '123456' });

    expect(res.status).toBe(200);
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('123456', 10);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: testUser.id }, data: { pin: 'hashed-pin' },
    });
  });
});

describe('POST /api/auth/verify-pin', () => {
  const auth = () => authHeader({ id: testUser.id, email: testUser.email });

  it('returns 400 when the pin field is missing from the body', async () => {
    const res = await request(app).post('/api/auth/verify-pin').set('Authorization', auth()).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/diperlukan/i);
  });

  it('returns 400 when the user has not set a PIN yet', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ pin: null } as any);

    const res = await request(app).post('/api/auth/verify-pin').set('Authorization', auth()).send({ pin: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/belum diatur/i);
  });

  it('returns 200 when the PIN matches the stored hash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ pin: 'hashed-pin' } as any);
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const res = await request(app).post('/api/auth/verify-pin').set('Authorization', auth()).send({ pin: '123456' });

    expect(res.status).toBe(200);
  });

  it('returns 401 when the PIN does not match', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ pin: 'hashed-pin' } as any);
    mockedBcrypt.compare.mockResolvedValue(false as never);

    const res = await request(app).post('/api/auth/verify-pin').set('Authorization', auth()).send({ pin: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('PIN salah');
  });
});
