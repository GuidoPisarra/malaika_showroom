import { IDENTITY } from '@malaika/common';
import type { StoreSettings } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantsService } from './tenants.service.js';
import type { CreateTenantInput, UpdateTenantInput } from './tenants.service.js';

@Controller()
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @MessagePattern(IDENTITY.resolveTenant)
  resolve(@Payload() data: { host?: string; slug?: string }) {
    return this.tenants.resolve(data);
  }

  @MessagePattern(IDENTITY.getTenant)
  get(@Payload() data: { tenantId: string }) {
    return this.tenants.get(data.tenantId);
  }

  @MessagePattern(IDENTITY.listTenants)
  list() {
    return this.tenants.list();
  }

  @MessagePattern(IDENTITY.createTenant)
  create(@Payload() data: CreateTenantInput) {
    return this.tenants.create(data);
  }

  @MessagePattern(IDENTITY.updateTenant)
  update(@Payload() data: UpdateTenantInput) {
    return this.tenants.update(data);
  }

  @MessagePattern(IDENTITY.updateStoreSettings)
  updateSettings(@Payload() data: { tenantId: string; settings: Partial<StoreSettings> }) {
    return this.tenants.updateSettings(data);
  }
}
