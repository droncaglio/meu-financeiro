import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ tenantId?: string }>();
    const tenantId = request.tenantId;

    if (tenantId) {
      void this.prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    }

    return next.handle();
  }
}
