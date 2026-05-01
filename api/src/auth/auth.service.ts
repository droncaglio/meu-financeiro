import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { ALL_PERMISSIONS } from '../common/constants/permissions';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

interface TokenSigningContext {
  tenantStatus: TenantStatus;
  roleId: string;
  roleName: string;
  isSuperUser: boolean;
  permissions: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    const pepper = this.config.getOrThrow<string>('APP_PEPPER');
    const passwordHash = await bcrypt.hash(pepper + dto.password, 12);
    const emailVerifyToken = randomBytes(32).toString('hex');
    const emailVerifyExp = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
    const slugBase = this.toSlugBase(dto.companyName);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          emailVerifyToken,
          emailVerifyExp,
        },
      });

      let tenant: Awaited<ReturnType<typeof tx.tenant.create>> | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug =
          attempt === 0
            ? slugBase
            : `${slugBase}-${randomBytes(3).toString('hex')}`;
        try {
          tenant = await tx.tenant.create({
            data: { name: dto.companyName, slug, status: TenantStatus.active },
          });
          break;
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2002'
          ) {
            continue;
          }
          throw e;
        }
      }
      if (!tenant)
        throw new InternalServerErrorException(
          'Não foi possível gerar slug único',
        );

      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner',
          description: 'Acesso total ao tenant',
          isSystem: true,
          permissions: {
            create: ALL_PERMISSIONS.map((permission) => ({ permission })),
          },
        },
      });

      await tx.tenantUser.create({
        data: {
          userId: created.id,
          tenantId: tenant.id,
          roleId: ownerRole.id,
        },
      });

      return created;
    });

    await this.mail.sendVerification(user.email, user.name, emailVerifyToken);
    return {
      message: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerifyExp: { gt: new Date() },
      },
      include: { tenantUsers: true },
    });

    if (!user) throw new NotFoundException('Token inválido ou expirado');
    if (user.emailVerifiedAt)
      throw new BadRequestException('E-mail já verificado');

    const tenantUser = user.tenantUsers[0];
    if (!tenantUser)
      throw new InternalServerErrorException('Configuração de tenant ausente');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerifyToken: null,
        emailVerifyExp: null,
      },
    });

    const ctx = await this.loadTokenContext(user.id, tenantUser.tenantId);
    if (!ctx)
      throw new InternalServerErrorException('Configuração de tenant ausente');
    return this.buildTokenPair(user.id, tenantUser.tenantId, ctx);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenantUsers: {
          include: { tenant: true, role: true },
          orderBy: { joinedAt: 'desc' },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const pepper = this.config.getOrThrow<string>('APP_PEPPER');
    const valid = await bcrypt.compare(
      pepper + dto.password,
      user.passwordHash,
    );
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'E-mail não verificado. Verifique sua caixa de entrada.',
      );
    }

    const activeTenantUsers = user.tenantUsers.filter(
      (tu) => tu.tenant.status === TenantStatus.active,
    );
    if (!activeTenantUsers.length)
      throw new UnauthorizedException('Nenhum tenant ativo');

    const selected = activeTenantUsers[0];
    const ctx = await this.loadTokenContext(user.id, selected.tenantId);
    if (!ctx) throw new UnauthorizedException('Sem acesso a este tenant');
    const { accessToken, refreshToken } = await this.buildTokenPair(
      user.id,
      selected.tenantId,
      ctx,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      tenant: {
        id: selected.tenant.id,
        name: selected.tenant.name,
        slug: selected.tenant.slug,
        roleId: ctx.roleId,
        roleName: ctx.roleName,
      },
      tenants: activeTenantUsers.map((tu) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        roleId: tu.roleId,
        roleName: tu.role.name,
      })),
    };
  }

  async refresh(currentToken: string | undefined) {
    if (!currentToken) throw new UnauthorizedException('Refresh token ausente');

    const tokenHash = createHash('sha256').update(currentToken).digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (!record.tenantId) throw new UnauthorizedException('Token inválido');
    const tenantId = record.tenantId;

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const ctx = await this.loadTokenContext(record.userId, tenantId);
    if (!ctx || ctx.tenantStatus !== TenantStatus.active) {
      throw new UnauthorizedException('Acesso ao tenant revogado ou inativo');
    }

    return this.buildTokenPair(record.userId, tenantId, ctx);
  }

  async logout(currentToken: string | undefined) {
    if (!currentToken) return;
    const tokenHash = createHash('sha256').update(currentToken).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    const msg = {
      message: 'Se o e-mail existir, você receberá instruções em breve.',
    };
    if (!user) return msg;

    const rawToken = randomBytes(32).toString('hex');
    const resetPasswordToken = createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const resetPasswordExp = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExp },
    });

    await this.mail.sendPasswordReset(user.email, user.name, rawToken);
    return msg;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExp: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Token inválido ou expirado');

    const pepper = this.config.getOrThrow<string>('APP_PEPPER');
    const passwordHash = await bcrypt.hash(pepper + dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExp: null },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Senha redefinida com sucesso.' };
  }

  async switchTenant(
    userId: string,
    tenantId: string,
    currentRefreshToken: string | undefined,
  ) {
    const ctx = await this.loadTokenContext(userId, tenantId);

    if (!ctx) throw new ForbiddenException('Sem acesso a este tenant');
    if (ctx.tenantStatus !== TenantStatus.active)
      throw new ForbiddenException('Tenant inativo');

    if (currentRefreshToken) {
      const tokenHash = createHash('sha256')
        .update(currentRefreshToken)
        .digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return this.buildTokenPair(userId, tenantId, ctx);
  }

  private async loadTokenContext(
    userId: string,
    tenantId: string,
  ): Promise<TokenSigningContext | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
      const [tenantUser, user] = await Promise.all([
        tx.tenantUser.findUnique({
          where: { tenantId_userId: { tenantId, userId } },
          include: {
            tenant: { select: { status: true } },
            role: { include: { permissions: true } },
          },
        }),
        tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { isSuperUser: true },
        }),
      ]);

      if (!tenantUser) return null;

      return {
        tenantStatus: tenantUser.tenant.status,
        roleId: tenantUser.roleId,
        roleName: tenantUser.role.name,
        isSuperUser: user.isSuperUser,
        permissions: tenantUser.role.permissions.map((p) => p.permission),
      };
    });
  }

  private async buildTokenPair(
    userId: string,
    tenantId: string,
    ctx: TokenSigningContext,
  ) {
    const accessToken = this.jwt.sign({
      sub: userId,
      tenantId,
      roleId: ctx.roleId,
      roleName: ctx.roleName,
      isSuperUser: ctx.isSuperUser,
      permissions: ctx.permissions,
    });

    const rawToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { userId, tenantId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken: rawToken };
  }

  private toSlugBase(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 90);
  }
}
