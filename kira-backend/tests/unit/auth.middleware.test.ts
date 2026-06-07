import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../../src/middleware/auth.middleware';
import { signTestToken } from '../helpers/authToken';

function buildReqRes(authHeader?: string) {
  const req: any = { headers: { authorization: authHeader } };
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticateJWT middleware', () => {
  it('returns 401 when the Authorization header is missing', () => {
    const { req, res, next } = buildReqRes(undefined);

    authenticateJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the header does not start with "Bearer "', () => {
    const { req, res, next } = buildReqRes('Basic abc123');

    authenticateJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with "Invalid or expired token" when the token fails verification', () => {
    const { req, res, next } = buildReqRes('Bearer not-a-real-token');

    authenticateJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is signed with a different secret', () => {
    const wrongSecretToken = jwt.sign({ id: 'user-1', email: 'a@b.com' }, 'wrong-secret');
    const { req, res, next } = buildReqRes(`Bearer ${wrongSecretToken}`);

    authenticateJWT(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches the decoded payload to req.user and calls next() for a valid token', () => {
    const token = signTestToken({ id: 'user-1', email: 'user@example.com' });
    const { req, res, next } = buildReqRes(`Bearer ${token}`);

    authenticateJWT(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 'user-1', email: 'user@example.com' });
  });
});
