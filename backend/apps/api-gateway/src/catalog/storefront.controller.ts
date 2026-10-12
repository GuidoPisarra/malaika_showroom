import { CATALOG, ORDERS } from '@malaika/common';
import type { TenantContext } from '@malaika/common';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Broker } from '../core/broker.service.js';
import { ProductQuery } from '../dto/catalog-query.dto.js';
import { ValidateCouponDto } from '../dto/order.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

/** Endpoints públicos de la tienda. */
@Controller()
export class StorefrontController {
  constructor(private readonly broker: Broker) {}

  /** Nombre y reglas comerciales del comercio (envío, descuentos, transferencia). */
  @Get('store')
  store(@CurrentTenant() tenant: TenantContext) {
    return { id: tenant.id, slug: tenant.slug, name: tenant.name, settings: tenant.settings };
  }

  @Get('products')
  products(@CurrentTenant() tenant: TenantContext, @Query() filter: ProductQuery) {
    return this.broker.send(CATALOG.listProducts, { tenantId: tenant.id, filter });
  }

  @Get('products/featured')
  featured(@CurrentTenant() tenant: TenantContext) {
    return this.broker.send(CATALOG.featuredProducts, { tenantId: tenant.id });
  }

  @Get('products/:id')
  product(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.broker.send(CATALOG.getProduct, { tenantId: tenant.id, id });
  }

  @Get('look-presets')
  presets(@CurrentTenant() tenant: TenantContext) {
    return this.broker.send(CATALOG.listPresets, { tenantId: tenant.id });
  }

  @Get('showroom-zones')
  zones(@CurrentTenant() tenant: TenantContext) {
    return this.broker.send(CATALOG.listZones, { tenantId: tenant.id });
  }

  @Post('coupons/validate')
  @HttpCode(200)
  validateCoupon(@CurrentTenant() tenant: TenantContext, @Body() dto: ValidateCouponDto) {
    return this.broker.send(ORDERS.validateCoupon, { tenantId: tenant.id, code: dto.code, subtotal: dto.subtotal });
  }
}
