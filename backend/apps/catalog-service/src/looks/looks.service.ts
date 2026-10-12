import { badRequest, notFound } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import { CACHE_TTL_SECONDS, CacheService, cacheKey } from '../cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PresetInput {
  id?: string;
  name: string;
  subtitle?: string;
  tag?: string;
  imagePreview: string;
  itemIds: string[];
  position?: number;
}

export interface HotspotInput {
  productId: string;
  xPercent: number;
  yPercent: number;
  label: string;
  category?: string;
  standType?: string;
  rotationY?: number | null;
}

export interface ZoneInput {
  id?: string;
  name: string;
  ambianceTitle?: string;
  description?: string;
  bgGradient?: string;
  accentColor?: string;
  panoramicImage: string;
  position?: number;
  hotspots: HotspotInput[];
}

@Injectable()
export class LooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  // --- Looks armados por el comercio ---

  listPresets(tenantId: string) {
    return this.cache.getOrSet(cacheKey(tenantId, 'presets'), CACHE_TTL_SECONDS, () =>
      this.prisma.lookPreset.findMany({ where: { tenantId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }),
    );
  }

  async upsertPreset(tenantId: string, input: PresetInput) {
    await this.assertProducts(tenantId, input.itemIds);
    const { id, ...data } = input;
    const preset = id
      ? await this.prisma.lookPreset.update({ where: { id, tenantId }, data })
      : await this.prisma.lookPreset.create({ data: { ...data, tenantId } });
    await this.cache.invalidateTenant(tenantId);
    return preset;
  }

  async deletePreset(tenantId: string, id: string) {
    await this.prisma.lookPreset.delete({ where: { id, tenantId } });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  // --- Zonas del showroom AR ---

  listZones(tenantId: string) {
    return this.cache.getOrSet(cacheKey(tenantId, 'zones'), CACHE_TTL_SECONDS, async () => {
      const zones = await this.prisma.showroomZone.findMany({
        where: { tenantId },
        include: { hotspots: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      const ids = [...new Set(zones.flatMap((z) => z.hotspots.map((h) => h.productId)))];
      const prices = new Map(
        (await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, price: true } })).map(
          (p) => [p.id, p.price],
        ),
      );
      return zones.map(({ hotspots, ...zone }) => ({
        ...zone,
        hotspots: hotspots.map(({ zoneId: _z, rotationY, ...h }) => ({
          ...h,
          rotationY: rotationY ?? undefined,
          price: prices.get(h.productId) ?? 0,
        })),
      }));
    });
  }

  async upsertZone(tenantId: string, input: ZoneInput) {
    await this.assertProducts(tenantId, input.hotspots.map((h) => h.productId));
    const { id, hotspots, ...data } = input;
    const zone = await this.prisma.$transaction(async (tx) => {
      const saved = id
        ? await tx.showroomZone.update({ where: { id, tenantId }, data })
        : await tx.showroomZone.create({ data: { ...data, tenantId } });
      await tx.showroomHotspot.deleteMany({ where: { zoneId: saved.id } });
      await tx.showroomHotspot.createMany({ data: hotspots.map((h) => ({ ...h, zoneId: saved.id })) });
      return tx.showroomZone.findUniqueOrThrow({ where: { id: saved.id }, include: { hotspots: true } });
    });
    await this.cache.invalidateTenant(tenantId);
    return zone;
  }

  async deleteZone(tenantId: string, id: string) {
    await this.prisma.showroomZone.delete({ where: { id, tenantId } });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  // --- Looks guardados por clientas con cuenta ---

  listSaved(tenantId: string, userId: string) {
    return this.prisma.savedLook.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' } });
  }

  async save(tenantId: string, userId: string, input: { name: string; itemIds: string[] }) {
    if (!input.itemIds?.length) throw badRequest('El look no tiene prendas');
    await this.assertProducts(tenantId, input.itemIds);
    return this.prisma.savedLook.create({ data: { tenantId, userId, name: input.name, itemIds: input.itemIds } });
  }

  async deleteSaved(tenantId: string, userId: string, id: string) {
    const deleted = await this.prisma.savedLook.deleteMany({ where: { id, tenantId, userId } });
    if (!deleted.count) throw notFound('Look');
    return { ok: true };
  }

  private async assertProducts(tenantId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    const found = await this.prisma.product.count({ where: { tenantId, id: { in: unique } } });
    if (found !== unique.length) throw badRequest('Hay productos que no existen en este comercio');
  }
}
