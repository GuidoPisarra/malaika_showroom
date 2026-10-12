import { IDENTITY, PAYMENTS } from '@malaika/common';
import type { StoreSettings, TenantContext } from '@malaika/common';
import { Body, Controller, Get, Patch, Post, Put, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { CreateAdminDto, PaymentSettingsDto, StoreSettingsDto, UserListQuery } from '../dto/admin.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';
import { TenantResolver } from '../tenant/tenant-resolver.service.js';

@Controller('admin')
@Auth('ADMIN')
export class AdminStoreController {
  constructor(
    private readonly broker: Broker,
    private readonly tenants: TenantResolver,
  ) {}

  @Get('settings')
  settings(@CurrentTenant() t: TenantContext) {
    return this.broker.send(IDENTITY.getTenant, { tenantId: t.id });
  }

  @Patch('settings')
  async updateSettings(@CurrentTenant() t: TenantContext, @Body() dto: StoreSettingsDto) {
    const result = await this.broker.send(IDENTITY.updateStoreSettings, {
      tenantId: t.id,
      settings: dto as Partial<StoreSettings>,
    });
    await this.tenants.invalidate();
    return result;
  }

  @Get('payment-settings')
  paymentSettings(@CurrentTenant() t: TenantContext) {
    return this.broker.send(PAYMENTS.getSettings, { tenantId: t.id });
  }

  /** Credenciales de Mercado Pago del comercio. Se guardan cifradas y nunca se devuelven enteras. */
  @Put('payment-settings')
  updatePaymentSettings(@CurrentTenant() t: TenantContext, @Body() dto: PaymentSettingsDto) {
    return this.broker.send(PAYMENTS.updateSettings, { tenantId: t.id, settings: dto });
  }

  @Get('users')
  users(@CurrentTenant() t: TenantContext, @Query() q: UserListQuery) {
    return this.broker.send(IDENTITY.listUsers, { tenantId: t.id, ...q });
  }

  @Post('users')
  createAdmin(@CurrentTenant() t: TenantContext, @Body() dto: CreateAdminDto) {
    return this.broker.send(IDENTITY.createAdmin, { tenantId: t.id, ...dto });
  }
}
