import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../strategies/jwt.strategy';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user.tenantId;
  },
);
