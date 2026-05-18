import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function signToken(id: string, email: string) {
  return jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    const token = signToken(user.id, user.email);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id, user.email);
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const googleCallback = (req: Request, res: Response) => {
  const user = req.user as { id: string; name: string; email: string };
  const token = signToken(user.id, user.email);
  const params = new URLSearchParams({
    token,
    name: user.name,
    email: user.email,
  });
  return res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const payload = req.user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
