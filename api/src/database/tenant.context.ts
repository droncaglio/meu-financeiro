import { AsyncLocalStorage } from 'async_hooks';
import type { PrismaClient } from '@prisma/client';

export type TxClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

export const tenantStorage = new AsyncLocalStorage<TxClient>();
