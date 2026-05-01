import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../../common/constants/permissions';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { AuthUser } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) return true;

    const user: AuthUser | undefined = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>().user;

    if (!user) return false;
    if (user.isSuperUser) return true;

    return required.every((p) => user.permissions.includes(p));
  }
}
