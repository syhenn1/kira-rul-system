import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

export function signTestToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authHeader(payload: { id: string; email: string }) {
  return `Bearer ${signTestToken(payload)}`;
}
