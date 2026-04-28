import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerification(to: string, name: string, token: string) {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const link = `${appUrl}/auth/verify-email?token=${token}`;

    if (this.isDev()) {
      this.logger.log(`[DEV EMAIL] Verificação para ${to} → ${link}`);
      return;
    }

    await this.send(
      to,
      'Confirme seu e-mail — Meu Financeiro',
      this.verificationHtml(name, link),
    );
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const link = `${appUrl}/auth/reset-password?token=${token}`;

    if (this.isDev()) {
      this.logger.log(`[DEV EMAIL] Reset de senha para ${to} → ${link}`);
      return;
    }

    await this.send(
      to,
      'Redefinição de senha — Meu Financeiro',
      this.resetHtml(name, link),
    );
  }

  private async send(to: string, subject: string, html: string) {
    const port = this.config.get<number>('SMTP_PORT', 587);
    const transport = nodemailer.createTransport({
      host: this.config.getOrThrow('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: {
        user: this.config.getOrThrow('SMTP_USER'),
        pass: this.config.getOrThrow('SMTP_PASS'),
      },
    });

    await transport.sendMail({
      from: this.config.get(
        'SMTP_FROM',
        'Meu Financeiro <noreply@example.com>',
      ),
      to,
      subject,
      html,
    });
  }

  private isDev() {
    return (
      this.config.get('NODE_ENV') !== 'production' ||
      !this.config.get('SMTP_HOST')
    );
  }

  private verificationHtml(name: string, link: string) {
    return `<p>Olá, ${name}!</p>
<p>Clique no link abaixo para confirmar seu e-mail e ativar sua conta:</p>
<p><a href="${link}">${link}</a></p>
<p>O link expira em 24 horas.</p>`;
  }

  private resetHtml(name: string, link: string) {
    return `<p>Olá, ${name}!</p>
<p>Você solicitou a redefinição de senha. Clique no link abaixo:</p>
<p><a href="${link}">${link}</a></p>
<p>O link expira em 1 hora. Se não foi você, ignore este e-mail.</p>`;
  }
}
