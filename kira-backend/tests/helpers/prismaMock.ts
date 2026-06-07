import { mockDeep, mockReset } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

/**
 * Single shared deep-mock instance. Test files register it as the mocked
 * `default` export of `src/lib/prisma` via an inline `jest.mock` factory:
 *
 *   jest.mock('../../src/lib/prisma', () => ({
 *     __esModule: true,
 *     default: require('../helpers/prismaMock').prismaMock,
 *   }));
 *
 * so the instance `index.ts` calls through is the exact same object this
 * file's assertions configure — a `__mocks__` folder + separate `jest.mock`
 * call resolves the substituted module and the directly-imported helper to
 * two different instances, leaving `mockResolvedValue` setup with no effect.
 */
export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});
