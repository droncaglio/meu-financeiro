import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { PermissionsGuard } from './permissions.guard';

function mockContext(
  user: unknown,
  handler = jest.fn(),
  cls = jest.fn(),
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => cls,
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PermissionsGuard, Reflector],
    }).compile();
    guard = module.get(PermissionsGuard);
    reflector = module.get(Reflector);
  });

  it('allows when no permissions required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ permissions: [] }))).toBe(true);
  });

  it('allows when required permissions array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    expect(guard.canActivate(mockContext({ permissions: [] }))).toBe(true);
  });

  it('denies when no user in request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['accounts:read']);
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });

  it('allows superUser regardless of permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['accounts:delete']);
    const user = { isSuperUser: true, permissions: [] };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('allows when user has all required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['accounts:read', 'entries:read']);
    const user = {
      isSuperUser: false,
      permissions: ['accounts:read', 'entries:read', 'reports:read'],
    };
    expect(guard.canActivate(mockContext(user))).toBe(true);
  });

  it('denies when user is missing one required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['accounts:read', 'entries:write']);
    const user = { isSuperUser: false, permissions: ['accounts:read'] };
    expect(guard.canActivate(mockContext(user))).toBe(false);
  });

  it('uses PERMISSIONS_KEY for reflector lookup', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined);
    const ctx = mockContext({});
    guard.canActivate(ctx);
    expect(spy).toHaveBeenCalledWith(PERMISSIONS_KEY, expect.any(Array));
  });
});
