import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import type { AuthUser } from './strategies/jwt.strategy';

const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ register: {} })
  @ApiOperation({ summary: 'Cadastrar novo usuário e empresa' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar e-mail via token' })
  async verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.verifyEmail(token);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: {} })
  @ApiOperation({ summary: 'Login' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token via refresh token (cookie)' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    const { refreshToken, ...rest } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerrar sessão' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[COOKIE_NAME] as string | undefined;
    await this.authService.logout(token);
    res.clearCookie(COOKIE_NAME, { path: COOKIE_PATH });
    return { message: 'Sessão encerrada.' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ sensitive: {} })
  @ApiOperation({ summary: 'Solicitar redefinição de senha' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ sensitive: {} })
  @ApiOperation({ summary: 'Redefinir senha via token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('switch-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trocar tenant ativo' })
  async switchTenant(
    @CurrentUser() user: AuthUser,
    @Body() dto: SwitchTenantDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.switchTenant(
      user.userId,
      dto.tenantId,
    );
    this.setRefreshCookie(res, refreshToken);
    return rest;
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: COOKIE_PATH,
    });
  }
}
