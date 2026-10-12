import { badRequest, notFound } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import { Prisma, type Product, type ProductVariant } from '../generated/prisma/client.js';
import { CACHE_TTL_SECONDS, CacheService, cacheKey } from '../cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { filterProducts } from './product.filter.js';
import type { ProductColor, ProductFilter, ProductInput, ProductView, VariantStock } from './product.types.js';
import { sortVariants, variantCombinations } from './variants.js';

type ProductWithVariants = Product & { variants: ProductVariant[] };

const withVariants = { variants: true } as const;

export function toProductView(p: ProductWithVariants): ProductView {
  const colors = (p.colors ?? []) as unknown as ProductColor[];
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
    colors,
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
    variantStock: p.variantStock,
    variants: p.variantStock
      ? sortVariants({ sizes: p.sizes, colors }, p.variants).map((v) => ({ size: v.size, color: v.color, stock: v.stock }))
      : [],
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
        include: withVariants,
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
    return toProductView(await this.findOrThrow(tenantId, id));
  }

  async byIds(tenantId: string, ids: string[]): Promise<ProductView[]> {
    const rows = await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, include: withVariants });
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
        include: withVariants,
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
      include: withVariants,
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
    await this.findOrThrow(tenantId, id);
    // El stock se ajusta solo por setStock, para dejar registro del movimiento.
    const { stock: _ignored, ...rest } = input;
    await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({ where: { id }, data: toData(rest), include: withVariants });
      if (product.variantStock) await this.dropStaleVariants(tx, product);
    });
    await this.cache.invalidateTenant(tenantId);
    return this.get(tenantId, id);
  }

  /** Baja lógica: el producto deja de mostrarse pero los pedidos viejos lo siguen referenciando. */
  async remove(tenantId: string, id: string): Promise<{ ok: true }> {
    await this.get(tenantId, id);
    await this.prisma.product.update({ where: { id }, data: { active: false } });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  /**
   * Fija el stock de un producto. Con `stock` se controla en general; con
   * `variants` se controla por talle y color y el stock del producto pasa a ser
   * la suma. Cada cambio queda registrado como movimiento ADJUST.
   */
  async setStock(tenantId: string, id: string, input: { stock?: number; variants?: VariantStock[] }): Promise<ProductView> {
    const current = await this.findOrThrow(tenantId, id);
    if ((input.stock === undefined) === (input.variants === undefined)) {
      throw badRequest('Indicá el stock general o el stock por talle y color, no ambos');
    }

    await this.prisma.$transaction(async (tx) => {
      if (input.variants === undefined) {
        const target = Math.max(0, Math.floor(input.stock!));
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.product.update({ where: { id }, data: { stock: target, variantStock: false } });
        if (target !== current.stock) {
          await tx.stockMovement.create({ data: { tenantId, productId: id, type: 'ADJUST', quantity: target - current.stock } });
        }
        return;
      }

      const valid = new Set(variantCombinations({ sizes: current.sizes, colors: current.colors as unknown as ProductColor[] }).map((c) => `${c.size}\u0000${c.color}`));
      const wanted = new Map<string, VariantStock>();
      for (const v of input.variants) {
        const key = `${v.size}\u0000${v.color}`;
        if (!valid.has(key)) {
          throw badRequest(`La combinación ${[v.size, v.color].filter(Boolean).join(' / ') || 'única'} no existe en el producto`);
        }
        wanted.set(key, { size: v.size, color: v.color, stock: Math.max(0, Math.floor(v.stock)) });
      }

      const existing = new Map(current.variants.map((v) => [`${v.size}\u0000${v.color}`, v]));
      for (const [key, v] of wanted) {
        const before = existing.get(key);
        const saved = before
          ? await tx.productVariant.update({ where: { id: before.id }, data: { stock: v.stock } })
          : await tx.productVariant.create({ data: { tenantId, productId: id, size: v.size, color: v.color, stock: v.stock } });
        const delta = v.stock - (before?.stock ?? 0);
        if (delta) {
          await tx.stockMovement.create({ data: { tenantId, productId: id, variantId: saved.id, type: 'ADJUST', quantity: delta } });
        }
      }
      // Las combinaciones que no vinieron quedan sin stock.
      for (const [key, v] of existing) {
        if (wanted.has(key)) continue;
        await tx.productVariant.delete({ where: { id: v.id } });
        if (v.stock) {
          await tx.stockMovement.create({ data: { tenantId, productId: id, variantId: v.id, type: 'ADJUST', quantity: -v.stock } });
        }
      }

      const total = [...wanted.values()].reduce((sum, v) => sum + v.stock, 0);
      await tx.product.update({ where: { id }, data: { stock: total, variantStock: true } });
      if (!current.variantStock && current.stock) {
        // Al pasar a stock por variante, el stock general anterior se reemplaza por la suma.
        await tx.stockMovement.create({ data: { tenantId, productId: id, type: 'ADJUST', quantity: -current.stock } });
      }
    });

    await this.cache.invalidateTenant(tenantId);
    return this.get(tenantId, id);
  }

  /**
   * Si el admin quita un talle o un color, se borran sus variantes y el stock
   * del producto se recalcula.
   */
  private async dropStaleVariants(tx: Prisma.TransactionClient, product: ProductWithVariants) {
    const colors = (product.colors ?? []) as unknown as ProductColor[];
    const valid = new Set(variantCombinations({ sizes: product.sizes, colors }).map((c) => `${c.size}\u0000${c.color}`));
    const stale = product.variants.filter((v) => !valid.has(`${v.size}\u0000${v.color}`));
    if (!stale.length) return;
    for (const v of stale) {
      await tx.productVariant.delete({ where: { id: v.id } });
      if (v.stock) {
        await tx.stockMovement.create({
          data: { tenantId: product.tenantId, productId: product.id, variantId: v.id, type: 'ADJUST', quantity: -v.stock },
        });
      }
    }
    const remaining = product.variants.filter((v) => valid.has(`${v.size}\u0000${v.color}`));
    await tx.product.update({ where: { id: product.id }, data: { stock: remaining.reduce((sum, v) => sum + v.stock, 0) } });
  }

  private async findOrThrow(tenantId: string, id: string): Promise<ProductWithVariants> {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId }, include: withVariants });
    if (!product) throw notFound('Producto');
    return product;
  }

}
