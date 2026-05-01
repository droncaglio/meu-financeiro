import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthUser {
  userId: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  isSuperUser: boolean;
  permissions: string[];
}

interface JwtPayload {
  sub: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  isSuperUser: boolean;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      roleName: payload.roleName,
      isSuperUser: payload.isSuperUser,
      permissions: payload.permissions,
    };
  }
}
