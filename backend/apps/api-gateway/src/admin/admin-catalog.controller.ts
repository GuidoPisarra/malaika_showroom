import { CATALOG } from '@malaika/common';
import type { TenantContext } from '@malaika/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { PageQuery } from '../dto/catalog-query.dto.js';
import { PresetDto, ProductDto, StockDto, UpdateProductDto, ZoneDto } from '../dto/admin.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

@Controller('admin')
@Auth('ADMIN')
export class AdminCatalogController {
  constructor(private readonly broker: Broker) {}

  @Get('products')
  products(@CurrentTenant() t: TenantContext, @Query() q: PageQuery) {
    return this.broker.send(CATALOG.adminListProducts, { tenantId: t.id, ...q });
  }

  @Get('products/:id')
  product(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(CATALOG.getProduct, { tenantId: t.id, id });
  }

  @Post('products')
  createProduct(@CurrentTenant() t: TenantContext, @Body() dto: ProductDto) {
    return this.broker.send(CATALOG.createProduct, { tenantId: t.id, product: dto });
  }

  @Patch('products/:id')
  updateProduct(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.broker.send(CATALOG.updateProduct, { tenantId: t.id, id, product: dto });
  }

  @Delete('products/:id')
  deleteProduct(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(CATALOG.deleteProduct, { tenantId: t.id, id });
  }

  @Put('products/:id/stock')
  setStock(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: StockDto) {
    return this.broker.send(CATALOG.setStock, { tenantId: t.id, id, stock: dto.stock });
  }

  @Get('look-presets')
  presets(@CurrentTenant() t: TenantContext) {
    return this.broker.send(CATALOG.listPresets, { tenantId: t.id });
  }

  @Post('look-presets')
  createPreset(@CurrentTenant() t: TenantContext, @Body() dto: PresetDto) {
    return this.broker.send(CATALOG.upsertPreset, { tenantId: t.id, preset: dto });
  }

  @Put('look-presets/:id')
  updatePreset(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: PresetDto) {
    return this.broker.send(CATALOG.upsertPreset, { tenantId: t.id, preset: { ...dto, id } });
  }

  @Delete('look-presets/:id')
  deletePreset(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(CATALOG.deletePreset, { tenantId: t.id, id });
  }

  @Get('showroom-zones')
  zones(@CurrentTenant() t: TenantContext) {
    return this.broker.send(CATALOG.listZones, { tenantId: t.id });
  }

  @Post('showroom-zones')
  createZone(@CurrentTenant() t: TenantContext, @Body() dto: ZoneDto) {
    return this.broker.send(CATALOG.upsertZone, { tenantId: t.id, zone: dto });
  }

  @Put('showroom-zones/:id')
  updateZone(@CurrentTenant() t: TenantContext, @Param('id') id: string, @Body() dto: ZoneDto) {
    return this.broker.send(CATALOG.upsertZone, { tenantId: t.id, zone: { ...dto, id } });
  }

  @Delete('showroom-zones/:id')
  deleteZone(@CurrentTenant() t: TenantContext, @Param('id') id: string) {
    return this.broker.send(CATALOG.deleteZone, { tenantId: t.id, id });
  }
}
