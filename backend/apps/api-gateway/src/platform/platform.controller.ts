import { IDENTITY } from '@malaika/common';
import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Auth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { LoginDto } from '../dto/auth.dto.js';
import { CreateTenantDto, UpdateTenantDto } from '../dto/platform.dto.js';
import { TenantResolver } from '../tenant/tenant-resolver.service.js';

/** Administración de la plataforma: alta y edición de comercios (solo superadmin). */
@Controller('platform')
export class PlatformController {
  constructor(
    private readonly broker: Broker,
    private readonly tenants: TenantResolver,
  ) {}

  @Post('auth/login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.broker.send(IDENTITY.platformLogin, dto);
  }

  @Get('tenants')
  @Auth('SUPERADMIN')
  list() {
    return this.broker.send(IDENTITY.listTenants, {});
  }

  @Get('tenants/:id')
  @Auth('SUPERADMIN')
  get(@Param('id') id: string) {
    return this.broker.send(IDENTITY.getTenant, { tenantId: id });
  }

  @Post('tenants')
  @Auth('SUPERADMIN')
  create(@Body() dto: CreateTenantDto) {
    return this.broker.send(IDENTITY.createTenant, dto);
  }

  @Patch('tenants/:id')
  @Auth('SUPERADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const result = await this.broker.send(IDENTITY.updateTenant, { tenantId: id, ...dto });
    await this.tenants.invalidate();
    return result;
  }
}
