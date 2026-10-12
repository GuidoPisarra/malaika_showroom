import { CATALOG, ORDERS } from '@malaika/common';
import type { JwtPayload, TenantContext } from '@malaika/common';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Auth, CurrentUser } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { SaveLookDto } from '../dto/order.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

/** "Mi cuenta" de las clientas registradas. */
@Controller('me')
@Auth()
export class AccountController {
  constructor(private readonly broker: Broker) {}

  @Get('orders')
  orders(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtPayload) {
    return this.broker.send(ORDERS.listMyOrders, { tenantId: tenant.id, userId: user.sub });
  }

  @Get('looks')
  looks(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtPayload) {
    return this.broker.send(CATALOG.listSavedLooks, { tenantId: tenant.id, userId: user.sub });
  }

  @Post('looks')
  saveLook(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtPayload, @Body() dto: SaveLookDto) {
    return this.broker.send(CATALOG.saveLook, { tenantId: tenant.id, userId: user.sub, look: dto });
  }

  @Delete('looks/:id')
  deleteLook(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.broker.send(CATALOG.deleteSavedLook, { tenantId: tenant.id, userId: user.sub, id });
  }
}
