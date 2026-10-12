import { ORDERS } from '@malaika/common';
import type { JwtPayload, TenantContext } from '@malaika/common';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, OptionalAuth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { CreateOrderDto, TrackOrderQuery } from '../dto/order.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly broker: Broker) {}

  /**
   * Crea el pedido (como invitada o con cuenta). Para Mercado Pago devuelve
   * `checkoutUrl`, adonde el front redirige a la clienta.
   */
  @Post()
  @OptionalAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentTenant() tenant: TenantContext, @CurrentUser() user: JwtPayload | undefined, @Body() dto: CreateOrderDto) {
    return this.broker.send(ORDERS.createOrder, {
      tenant,
      userId: user?.role === 'CUSTOMER' ? user.sub : null,
      customer: dto.customer,
      items: dto.items,
      couponCode: dto.couponCode || null,
      paymentMethod: dto.paymentMethod === 'bank-transfer' ? 'BANK_TRANSFER' : 'MERCADO_PAGO',
    });
  }

  /** Seguimiento para compras como invitada: número de pedido + correo. */
  @Get('track/:orderNumber')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  track(@CurrentTenant() tenant: TenantContext, @Param('orderNumber') orderNumber: string, @Query() q: TrackOrderQuery) {
    return this.broker.send(ORDERS.trackOrder, { tenantId: tenant.id, orderNumber, email: q.email });
  }
}
