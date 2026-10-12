import { IDENTITY } from '@malaika/common';
import type { JwtPayload, TenantContext } from '@malaika/common';
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Broker } from '../core/broker.service.js';
import { LoginDto, RefreshDto, RegisterDto } from '../dto/auth.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';
import { Auth, CurrentUser } from './auth.guard.js';

/** Cuentas de clientas y admins de cada comercio. */
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly broker: Broker) {}

  @Post('register')
  register(@CurrentTenant() tenant: TenantContext, @Body() dto: RegisterDto) {
    return this.broker.send(IDENTITY.register, { tenantId: tenant.id, ...dto });
  }

  @Post('login')
  @HttpCode(200)
  login(@CurrentTenant() tenant: TenantContext, @Body() dto: LoginDto) {
    return this.broker.send(IDENTITY.login, { tenantId: tenant.id, ...dto });
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.broker.send(IDENTITY.refresh, dto);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshDto) {
    return this.broker.send(IDENTITY.logout, dto);
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: JwtPayload) {
    return this.broker.send(IDENTITY.me, { userId: user.sub });
  }
}
