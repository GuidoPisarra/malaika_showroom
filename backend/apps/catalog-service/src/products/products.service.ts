import { notFound } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import { Prisma, type Product } from '../generated/prisma/client.js';
import { CACHE_TTL_SECONDS, CacheService, cacheKey } from '../cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { filterProducts } from './product.filter.js';
import type { ProductColor, ProductFilter, ProductInput, ProductView } from './product.types.js';

export function toProductView(p: Product): ProductView {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    subtitle: p.subtitle,
    price: p.price,
    originalPrice: p.originalPrice ?? undefined,
    category: p.category,
    slot: p.slot,
    image: p.image,
    gallery: p.gallery,
    colors: (p.colors ?? []) as unknown as ProductColor[],
    sizes: p.sizes,
    material: p.material,
    occasion: p.occasion,
    isNew: p.isNew,
    isTrending: p.isTrending,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    description: p.description,
    details: p.details,
    stock: p.stock,
    inStock: p.active && p.stock > 0,
    silhouette: p.silhouette ?? undefined,
    arModelType: p.arModelType ?? undefined,
    arScale: p.arScale ?? undefined,
    active: p.active,
    createdAt: p.createdAt.toISOString(),
  };
}

function toData(input: Partial<ProductInput>) {
  const { colors, silhouette, ...rest } = input;
  return {
    ...rest,
    ...(colors !== undefined ? { colors: colors as unknown as Prisma.InputJsonValue } : {}),
    ...(silhouette !== undefined
      ? { silhouette: silhouette === null ? Prisma.DbNull : (silhouette as Prisma.InputJsonValue) }
      : {}),
  };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Productos activos del comercio, cacheados en Redis. */
  private activeProducts(tenantId: string): Promise<ProductView[]> {
    return this.cache.getOrSet(cacheKey(tenantId, 'products'), CACHE_TTL_SECONDS, async () => {
      const rows = await this.prisma.product.findMany({
        where: { tenantId, active: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      return rows.map(toProductView);
    });
  }

  async list(tenantId: string, filter: ProductFilter = {}): Promise<ProductView[]> {
    return filterProducts(await this.activeProducts(tenantId), filter);
  }

  async featured(tenantId: string): Promise<ProductView[]> {
    return (await this.activeProducts(tenantId)).filter((p) => p.isTrending || p.isNew);
  }

  async get(tenantId: string, id: string): Promise<ProductView> {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw notFound('Producto');
    return toProductView(product);
  }

  async byIds(tenantId: string, ids: string[]): Promise<ProductView[]> {
    const rows = await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } } });
    return rows.map(toProductView);
  }

  async adminList(input: { tenantId: string; search?: string; page?: number; pageSize?: number; includeInactive?: boolean }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
    const where: Prisma.ProductWhereInput = {
      tenantId: input.tenantId,
      ...(input.includeInactive === false ? { active: true } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { sku: { contains: input.search, mode: 'insensitive' } },
              { category: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: rows.map(toProductView), total, page, pageSize };
  }

  async create(tenantId: string, input: ProductInput): Promise<ProductView> {
    const product = await this.prisma.product.create({
      data: { ...toData(input), tenantId, name: input.name, price: input.price, category: input.category, image: input.image },
    });
    if (product.stock) {
      await this.prisma.stockMovement.create({
        data: { tenantId, productId: product.id, type: 'ADJUST', quantity: product.stock },
      });
    }
    await this.cache.invalidateTenant(tenantId);
    return toProductView(product);
  }

  async update(tenantId: string, id: string, input: Partial<ProductInput>): Promise<ProductView> {
    await this.get(tenantId, id);
    // El stock se ajusta solo por setStock, para dejar registro del movimiento.
    const { stock: _ignored, ...rest } = input;
    const product = await this.prisma.product.update({ where: { id }, data: toData(rest) });
    await this.cache.invalidateTenant(tenantId);
    return toProductView(product);
  }

  /** Baja lógica: el producto deja de mostrarse pero los pedidos viejos lo siguen referenciando. */
  async remove(tenantId: string, id: string): Promise<{ ok: true }> {
    await this.get(tenantId, id);
    await this.prisma.product.update({ where: { id }, data: { active: false } });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  async setStock(tenantId: string, id: string, stock: number): Promise<ProductView> {
    const current = await this.get(tenantId, id);
    const target = Math.max(0, Math.floor(stock));
    const [product] = await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { stock: target } }),
      this.prisma.stockMovement.create({
        data: { tenantId, productId: id, type: 'ADJUST', quantity: target - current.stock },
      }),
    ]);
    await this.cache.invalidateTenant(tenantId);
    return toProductView(product);
  }
}
