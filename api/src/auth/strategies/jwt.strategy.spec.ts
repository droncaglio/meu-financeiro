import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();
    strategy = module.get(JwtStrategy);
  });

  it('maps JWT payload to AuthUser shape', () => {
    const payload = {
      sub: 'user-1',
      tenantId: 'tenant-1',
      roleId: 'role-1',
      roleName: 'Owner',
      isSuperUser: false,
      permissions: ['accounts:read'],
    };

    expect(strategy.validate(payload)).toEqual({
      userId: 'user-1',
      tenantId: 'tenant-1',
      roleId: 'role-1',
      roleName: 'Owner',
      isSuperUser: false,
      permissions: ['accounts:read'],
    });
  });

  it('preserves isSuperUser flag when true', () => {
    const payload = {
      sub: 'admin-1',
      tenantId: 't-1',
      roleId: 'r-1',
      roleName: 'SuperAdmin',
      isSuperUser: true,
      permissions: [],
    };

    expect(strategy.validate(payload).isSuperUser).toBe(true);
  });
});
