import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantUserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<TenantUserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    return requiredRoles.includes(user.role);
  }
}
