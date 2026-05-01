import { ExecutionContext } from '@nestjs/common';
import { SuperUserGuard } from './super-user.guard';

function mockContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('SuperUserGuard', () => {
  const guard = new SuperUserGuard();

  it('allows super user', () => {
    expect(guard.canActivate(mockContext({ isSuperUser: true }))).toBe(true);
  });

  it('denies regular user', () => {
    expect(guard.canActivate(mockContext({ isSuperUser: false }))).toBe(false);
  });

  it('denies when no user in request', () => {
    expect(guard.canActivate(mockContext(undefined))).toBe(false);
  });
});
