import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantStorage, type TxClient } from './tenant.context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns the tenant-scoped transaction client when inside a request with an
   * active tenant context (set by TenantContextInterceptor), otherwise returns
   * `this` for operations that bypass RLS (e.g. auth flows).
   */
  get tenantClient(): TxClient {
    return tenantStorage.getStore() ?? (this as unknown as TxClient);
  }
}
