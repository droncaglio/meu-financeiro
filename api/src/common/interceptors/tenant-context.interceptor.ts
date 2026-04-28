import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { tenantStorage } from '../../database/tenant.context';
import type { AuthUser } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) return next.handle();

    // Wrap the entire request in a single DB transaction so that:
    // 1. set_config with is_local=true is guaranteed to apply to all subsequent
    //    queries (they all share the same connection via the tx client).
    // 2. There is no cross-request tenant context bleed via the connection pool.
    return new Observable((observer) => {
      this.prisma
        .$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
          await new Promise<void>((resolve, reject) => {
            tenantStorage.run(tx, () => {
              next.handle().subscribe({
                next: (v) => observer.next(v),
                error: (e: unknown) =>
                  reject(e instanceof Error ? e : new Error(String(e))),
                complete: () => resolve(),
              });
            });
          });
        })
        .then(() => observer.complete())
        .catch((e: unknown) => observer.error(e));
    });
  }
}
