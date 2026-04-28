import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantStatus, TenantUserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    const slug = await this.uniqueSlug(dto.companyName);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          emailVerifyToken,
        },
      });
      const tenant = await tx.tenant.create({
        data: { name: dto.companyName, slug, status: TenantStatus.active },
      });
      await tx.tenantUser.create({
        data: {
          userId: created.id,
          tenantId: tenant.id,
          role: TenantUserRole.admin,
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
      where: { emailVerifyToken: token },
      include: { tenantUsers: true },
    });

    if (!user) throw new NotFoundException('Token inválido ou já utilizado');
    if (user.emailVerifiedAt)
      throw new BadRequestException('E-mail já verificado');

    const tenantUser = user.tenantUsers[0];

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), emailVerifyToken: null },
    });

    return this.mintTokens(user.id, tenantUser.tenantId, tenantUser.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenantUsers: {
          include: { tenant: true },
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
    const { accessToken, refreshToken } = await this.mintTokens(
      user.id,
      selected.tenantId,
      selected.role,
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      tenant: {
        id: selected.tenant.id,
        name: selected.tenant.name,
        slug: selected.tenant.slug,
        role: selected.role,
      },
      tenants: activeTenantUsers.map((tu) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        role: tu.role,
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

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const tenantUser = await this.prisma.tenantUser.findFirst({
      where: { userId: record.userId, tenantId: record.tenantId ?? undefined },
    });

    return this.mintTokens(
      record.userId,
      record.tenantId!,
      tenantUser?.role ?? TenantUserRole.viewer,
    );
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

    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordExp = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExp },
    });

    await this.mail.sendPasswordReset(
      user.email,
      user.name,
      resetPasswordToken,
    );
    return msg;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
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

  async switchTenant(userId: string, tenantId: string) {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });

    if (!tenantUser) throw new ForbiddenException('Sem acesso a este tenant');
    if (tenantUser.tenant.status !== TenantStatus.active) {
      throw new ForbiddenException('Tenant inativo');
    }

    return this.mintTokens(userId, tenantId, tenantUser.role);
  }

  private async mintTokens(
    userId: string,
    tenantId: string,
    role: TenantUserRole,
  ) {
    const accessToken = this.jwt.sign({ sub: userId, tenantId, role });

    const rawToken = randomBytes(64).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tenantId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken: rawToken };
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 90);

    let slug = base;
    let attempt = 0;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${base}-${randomBytes(3).toString('hex')}`;
      if (++attempt > 10) throw new Error('Não foi possível gerar slug único');
    }
    return slug;
  }
}
