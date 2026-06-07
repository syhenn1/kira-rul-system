import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Typed `any` to match the previous `require('@prisma/client')` call sites —
// the Prisma-generated types here disagree with several existing query shapes
// in index.ts (pre-existing issue, out of scope for a test-infra refactor).
const prisma: any = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL || ''),
});

export default prisma;
