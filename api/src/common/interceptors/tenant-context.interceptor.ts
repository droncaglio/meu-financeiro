import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const tenantId = request.user?.tenantId;

    if (!tenantId) return next.handle();

    return from(
      this.prisma
        .$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, false)`,
    ).pipe(switchMap(() => next.handle()));
  }
}
