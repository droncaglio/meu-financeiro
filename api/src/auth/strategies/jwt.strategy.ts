import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { TenantUserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface AuthUser {
  userId: string;
  tenantId: string;
  role: TenantUserRole;
}

interface JwtPayload {
  sub: string;
  tenantId: string;
  role: TenantUserRole;
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
      role: payload.role,
    };
  }
}
