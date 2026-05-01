import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2026-01-01T12:00:00Z');

const mockUser = {
  id: 'user-1',
  email: 'daniel@acme.com',
  name: 'Daniel',
  passwordHash: 'hashed-pw',
  emailVerifiedAt: NOW,
  isSuperUser: false,
};

const mockTenantUserRecord = {
  roleId: 'role-1',
  tenant: { status: TenantStatus.active },
  role: { name: 'Owner', permissions: [{ permission: 'accounts:read' }] },
};

const mockUserSuperStatus = { isSuperUser: false };

const mockLoginUser = {
  ...mockUser,
  tenantUsers: [
    {
      tenantId: 'tenant-1',
      roleId: 'role-1',
      joinedAt: NOW,
      role: { id: 'role-1', name: 'Owner' },
      tenant: {
        id: 'tenant-1',
        name: 'Acme',
        slug: 'acme',
        status: TenantStatus.active,
      },
    },
  ],
};

const mockRefreshTokenRecord = {
  id: 'rt-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  tokenHash: 'some-hash',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

// ---------------------------------------------------------------------------
// Mock transaction helper — rebuilt in beforeEach so per-test overrides don't bleed
// ---------------------------------------------------------------------------

function buildMockTx() {
  return {
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    user: {
      create: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'daniel@acme.com',
        name: 'Daniel',
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(mockUserSuperStatus),
    },
    tenant: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'tenant-1', name: 'Acme', slug: 'acme' }),
    },
    role: {
      create: jest.fn().mockResolvedValue({ id: 'role-1', name: 'Owner' }),
    },
    tenantUser: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(mockTenantUserRecord),
    },
  };
}

// ---------------------------------------------------------------------------
// Module-level mocks — no explicit type annotations so TypeScript infers jest.Mock
// ---------------------------------------------------------------------------

const mockPrisma = {
  $transaction: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn() };
const mockConfig = { getOrThrow: jest.fn() };
const mockMail = {
  sendVerification: jest.fn(),
  sendPasswordReset: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let mockTx: ReturnType<typeof buildMockTx>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockTx = buildMockTx();
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
    );

    mockJwt.sign.mockReturnValue('signed-access-token');
    mockConfig.getOrThrow.mockReturnValue('test-pepper');
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.updateMany.mockResolvedValue({});
    mockMail.sendVerification.mockResolvedValue(undefined);
    mockMail.sendPasswordReset.mockResolvedValue(undefined);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    const dto = {
      name: 'Daniel',
      email: 'daniel@acme.com',
      password: 'secret123',
      companyName: 'Acme',
    };

    it('returns success message and sends verification email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.register(dto);

      expect(result.message).toMatch(/Verifique seu e-mail/);
      expect(mockMail.sendVerification).toHaveBeenCalledTimes(1);
      expect(mockTx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: dto.email }),
        }),
      );
      expect(mockTx.role.create).toHaveBeenCalledTimes(1);
      expect(mockTx.tenantUser.create).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockMail.sendVerification).not.toHaveBeenCalled();
    });

    it('retries slug on P2002 and succeeds on second attempt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '7.0' },
      );
      mockTx.tenant.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce({
        id: 'tenant-2',
        name: 'Acme',
        slug: 'acme-abc123',
      });

      const result = await service.register(dto);

      expect(result.message).toMatch(/Verifique seu e-mail/);
      expect(mockTx.tenant.create).toHaveBeenCalledTimes(2);
    });

    it('throws InternalServerErrorException when all 5 slug attempts fail', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const p2002 = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        { code: 'P2002', clientVersion: '7.0' },
      );
      mockTx.tenant.create.mockRejectedValue(p2002);

      await expect(service.register(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockTx.tenant.create).toHaveBeenCalledTimes(5);
    });

    it('re-throws non-P2002 errors from tenant creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dbError = new Error('Connection lost');
      mockTx.tenant.create.mockRejectedValue(dbError);

      await expect(service.register(dto)).rejects.toThrow('Connection lost');
      expect(mockTx.tenant.create).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // verifyEmail
  // -------------------------------------------------------------------------

  describe('verifyEmail', () => {
    const token = 'valid-verify-token';

    const userWithTenantUser = {
      ...mockUser,
      emailVerifiedAt: null,
      tenantUsers: [
        { tenantId: 'tenant-1', userId: 'user-1', roleId: 'role-1' },
      ],
    };

    it('returns token pair on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userWithTenantUser);

      const result = await service.verifyEmail(token);

      expect(result).toEqual({
        accessToken: 'signed-access-token',
        refreshToken: expect.any(String),
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ emailVerifiedAt: expect.any(Date) }),
        }),
      );
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException for invalid or expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when email is already verified', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...userWithTenantUser,
        emailVerifiedAt: NOW,
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws InternalServerErrorException when tenantUsers array is empty', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...userWithTenantUser,
        tenantUsers: [],
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('throws InternalServerErrorException when loadTokenContext returns null', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(userWithTenantUser);
      mockTx.tenantUser.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(token)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    const dto = { email: 'daniel@acme.com', password: 'secret123' };

    it('returns tokens, user and tenant on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockLoginUser);

      const result = await service.login(dto);

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Daniel',
        email: 'daniel@acme.com',
      });
      expect(result.tenant).toEqual(
        expect.objectContaining({ id: 'tenant-1', name: 'Acme', slug: 'acme' }),
      );
      expect(result.tenants).toHaveLength(1);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockLoginUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email is not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockLoginUser,
        emailVerifiedAt: null,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user has no active tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockLoginUser,
        tenantUsers: [
          {
            ...mockLoginUser.tenantUsers[0],
            tenant: {
              ...mockLoginUser.tenantUsers[0].tenant,
              status: TenantStatus.suspended,
            },
          },
        ],
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when loadTokenContext returns null', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockLoginUser);
      mockTx.tenantUser.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    it('rotates tokens on success', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(
        mockRefreshTokenRecord,
      );

      const result = await service.refresh('raw-refresh-token');

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException when token is undefined', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token record is not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('raw-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token is revoked', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshTokenRecord,
        revokedAt: NOW,
      });

      await expect(service.refresh('raw-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshTokenRecord,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('raw-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when tenant becomes inactive after rotation', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(
        mockRefreshTokenRecord,
      );
      mockTx.tenantUser.findUnique.mockResolvedValue({
        ...mockTenantUserRecord,
        tenant: { status: TenantStatus.suspended },
      });

      await expect(service.refresh('raw-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  describe('logout', () => {
    it('revokes the refresh token when one is provided', async () => {
      await service.logout('raw-refresh-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('is a no-op when no token is provided', async () => {
      await service.logout(undefined);

      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // forgotPassword
  // -------------------------------------------------------------------------

  describe('forgotPassword', () => {
    const dto = { email: 'daniel@acme.com' };

    it('returns generic message and does not send email when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword(dto);

      expect(result.message).toMatch(/Se o e-mail existir/);
      expect(mockMail.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('stores SHA-256 hash in DB and sends raw token via email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword(dto);

      expect(result.message).toMatch(/Se o e-mail existir/);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExp: expect.any(Date),
          }),
        }),
      );

      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      const storedHash = updateCall.data.resetPasswordToken;

      const sendCall = mockMail.sendPasswordReset.mock.calls[0];
      const rawToken: string = sendCall[2];

      expect(rawToken).not.toBe(storedHash);
      expect(createHash('sha256').update(rawToken).digest('hex')).toBe(
        storedHash,
      );
    });
  });

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------

  describe('resetPassword', () => {
    const dto = { token: 'raw-reset-token', password: 'newSecret123' };

    it('updates password and revokes all refresh tokens on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Senha redefinida com sucesso.' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            passwordHash: 'hashed-pw',
            resetPasswordToken: null,
            resetPasswordExp: null,
          }),
        }),
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('queries DB using SHA-256 hash of the raw token, not the raw token itself', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await service.resetPassword(dto);

      const expectedHash = createHash('sha256').update(dto.token).digest('hex');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resetPasswordToken: expectedHash }),
        }),
      );
    });

    it('throws BadRequestException for invalid or expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // switchTenant
  // -------------------------------------------------------------------------

  describe('switchTenant', () => {
    it('revokes old refresh token and returns new token pair on success', async () => {
      const result = await service.switchTenant(
        'user-1',
        'tenant-1',
        'old-refresh-token',
      );

      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('does not call updateMany when no current refresh token is provided', async () => {
      await service.switchTenant('user-1', 'tenant-1', undefined);

      expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when user has no access to the target tenant', async () => {
      mockTx.tenantUser.findUnique.mockResolvedValue(null);

      await expect(
        service.switchTenant('user-1', 'tenant-2', undefined),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when target tenant is inactive', async () => {
      mockTx.tenantUser.findUnique.mockResolvedValue({
        ...mockTenantUserRecord,
        tenant: { status: TenantStatus.suspended },
      });

      await expect(
        service.switchTenant('user-1', 'tenant-1', undefined),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
