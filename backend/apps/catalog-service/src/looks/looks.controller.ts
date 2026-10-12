import { CATALOG } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LooksService } from './looks.service.js';
import type { PresetInput, ZoneInput } from './looks.service.js';

@Controller()
export class LooksController {
  constructor(private readonly looks: LooksService) {}

  @MessagePattern(CATALOG.listPresets)
  listPresets(@Payload() data: { tenantId: string }) {
    return this.looks.listPresets(data.tenantId);
  }

  @MessagePattern(CATALOG.upsertPreset)
  upsertPreset(@Payload() data: { tenantId: string; preset: PresetInput }) {
    return this.looks.upsertPreset(data.tenantId, data.preset);
  }

  @MessagePattern(CATALOG.deletePreset)
  deletePreset(@Payload() data: { tenantId: string; id: string }) {
    return this.looks.deletePreset(data.tenantId, data.id);
  }

  @MessagePattern(CATALOG.listZones)
  listZones(@Payload() data: { tenantId: string }) {
    return this.looks.listZones(data.tenantId);
  }

  @MessagePattern(CATALOG.upsertZone)
  upsertZone(@Payload() data: { tenantId: string; zone: ZoneInput }) {
    return this.looks.upsertZone(data.tenantId, data.zone);
  }

  @MessagePattern(CATALOG.deleteZone)
  deleteZone(@Payload() data: { tenantId: string; id: string }) {
    return this.looks.deleteZone(data.tenantId, data.id);
  }

  @MessagePattern(CATALOG.listSavedLooks)
  listSaved(@Payload() data: { tenantId: string; userId: string }) {
    return this.looks.listSaved(data.tenantId, data.userId);
  }

  @MessagePattern(CATALOG.saveLook)
  save(@Payload() data: { tenantId: string; userId: string; look: { name: string; itemIds: string[] } }) {
    return this.looks.save(data.tenantId, data.userId, data.look);
  }

  @MessagePattern(CATALOG.deleteSavedLook)
  deleteSaved(@Payload() data: { tenantId: string; userId: string; id: string }) {
    return this.looks.deleteSaved(data.tenantId, data.userId, data.id);
  }
}
