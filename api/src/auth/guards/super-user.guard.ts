import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthUser } from '../strategies/jwt.strategy';

@Injectable()
export class SuperUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthUser | undefined = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>().user;
    return user?.isSuperUser === true;
  }
}
