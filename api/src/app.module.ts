import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { DatabaseModule } from './database/database.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          name: 'login',
          ttl: cfg.get<number>('THROTTLE_LOGIN_TTL', 60_000),
          limit: cfg.get<number>('THROTTLE_LOGIN_LIMIT', 20),
        },
        {
          name: 'register',
          ttl: cfg.get<number>('THROTTLE_REGISTER_TTL', 3_600_000),
          limit: cfg.get<number>('THROTTLE_REGISTER_LIMIT', 20),
        },
        {
          name: 'sensitive',
          ttl: cfg.get<number>('THROTTLE_SENSITIVE_TTL', 900_000),
          limit: cfg.get<number>('THROTTLE_SENSITIVE_LIMIT', 10),
        },
      ],
    }),
    DatabaseModule,
    MailModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule {}
