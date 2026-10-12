import { ORDERS } from '@malaika/common';
import type { TenantContext } from '@malaika/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { CouponDto, OrderListQuery, OrderStatusDto, UpdateCouponDto } from '../dto/admin.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

@Controller('admin')
@Auth('ADMIN')
export class AdminSalesController {
  constructor(private readonly broker: Broker) {}

  @Get('dashboard')
  dashboard(@CurrentTenant() t: TenantContext) {
    return this.broker.send(ORDERS.dashboard, { tenantId: t.id });
  }

  @Get('orders')
  orders(@CurrentTenant() t: TenantContext, @Query() q: OrderListQuery) {
    return this.broker.send(ORDERS.adminListOrders, { tenantId: t.id, ...q });
  }

  @Get('orders/:id')
  order(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(ORDERS.adminGetOrder, { tenantId: t.id, id });
  }

  /** Cambia el estado: marcar pagada una transferencia, despachar, entregar o cancelar. */
  @Patch('orders/:id/status')
  updateStatus(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: OrderStatusDto) {
    return this.broker.send(ORDERS.updateStatus, { tenantId: t.id, id, ...dto });
  }

  @Get('coupons')
  coupons(@CurrentTenant() t: TenantContext) {
    return this.broker.send(ORDERS.listCoupons, { tenantId: t.id });
  }

  @Post('coupons')
  createCoupon(@CurrentTenant() t: TenantContext, @Body() dto: CouponDto) {
    return this.broker.send(ORDERS.upsertCoupon, { tenantId: t.id, coupon: dto });
  }

  @Patch('coupons/:id')
  updateCoupon(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.broker.send(ORDERS.upsertCoupon, { tenantId: t.id, coupon: { ...dto, id } });
  }

  @Delete('coupons/:id')
  deleteCoupon(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(ORDERS.deleteCoupon, { tenantId: t.id, id });
  }
}
