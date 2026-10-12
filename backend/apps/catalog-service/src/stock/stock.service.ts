import { conflict } from '@malaika/common';
import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { CacheService } from '../cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProductColor } from '../products/product.types.js';
import { variantKey } from '../products/variants.js';

export interface StockLine {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

/** Suma las líneas del mismo producto, talle y color. */
function mergeLines(lines: StockLine[]): StockLine[] {
  const merged = new Map<string, StockLine>();
  for (const l of lines) {
    const key = [l.productId, l.size ?? '', l.color ?? ''].join('\u0000');
    const prev = merged.get(key);
    merged.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l });
  }
  return [...merged.values()];
}

/** Lo que un pedido tiene descontado, por producto y variante. */
interface NetMovement {
  productId: string;
  variantId: string | null;
  quantity: number;
}

const netKey = (productId: string, variantId: string | null) => `${productId}\u0000${variantId ?? ''}`;

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Reserva stock para un pedido de forma atómica: si algún producto (o talle
   * y color, si el producto controla stock por variante) no alcanza, no se
   * descuenta nada. Es idempotente por pedido.
   */
  async reserve(input: { tenantId: string; orderId: string; items: StockLine[] }): Promise<{ ok: true }> {
    const { tenantId, orderId } = input;
    await this.prisma.$transaction(async (tx) => {
      const already = await tx.stockMovement.count({ where: { tenantId, orderId, type: 'RESERVE' } });
      if (already) return;

      for (const line of mergeLines(input.items)) {
        const { productId, quantity } = line;
        const product = await tx.product.findFirst({ where: { id: productId, tenantId, active: true } });
        if (!product) throw conflict('Uno de los productos ya no está disponible', 'PRODUCT_UNAVAILABLE');

        let variantId: string | null = null;
        if (product.variantStock) {
          const key = variantKey(
            { sizes: product.sizes, colors: product.colors as unknown as ProductColor[] },
            line.size,
            line.color,
          );
          const variant = await tx.productVariant.findUnique({
            where: { productId_size_color: { productId, size: key.size, color: key.color } },
          });
          const updated = variant
            ? await tx.productVariant.updateMany({
                where: { id: variant.id, stock: { gte: quantity } },
                data: { stock: { decrement: quantity } },
              })
            : { count: 0 };
          if (updated.count === 0) {
            const label = [key.size && `talle ${key.size}`, key.color].filter(Boolean).join(', ');
            throw conflict(
              `No hay stock suficiente de "${product.name}"${label ? ` (${label})` : ''}: quedan ${variant?.stock ?? 0}`,
              'OUT_OF_STOCK',
            );
          }
          variantId = variant!.id;
          await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
        } else {
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (updated.count === 0) {
            throw conflict(`No hay stock suficiente de "${product.name}" (quedan ${product.stock})`, 'OUT_OF_STOCK');
          }
        }
        await tx.stockMovement.create({
          data: { tenantId, orderId, productId, variantId, type: 'RESERVE', quantity: -quantity },
        });
      }
    });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  /** Devuelve al stock lo que tenga reservado un pedido cancelado o vencido. */
  async release(input: { tenantId: string; orderId: string }): Promise<void> {
    const { tenantId, orderId } = input;
    await this.prisma.$transaction(async (tx) => {
      for (const net of (await this.netByVariant(tx, tenantId, orderId)).values()) {
        if (net.quantity >= 0) continue;
        await this.applyDelta(tx, net.productId, net.variantId, -net.quantity);
        await tx.stockMovement.create({
          data: { tenantId, orderId, productId: net.productId, variantId: net.variantId, type: 'RELEASE', quantity: -net.quantity },
        });
      }
    });
    await this.cache.invalidateTenant(tenantId);
  }

  /**
   * Un pago puede aprobarse después de que el pedido venció y liberó su stock.
   * En ese caso se vuelve a descontar (aunque quede negativo) para que el admin lo vea.
   */
  async confirm(input: { tenantId: string; orderId: string; orderNumber: string }): Promise<void> {
    const { tenantId, orderId } = input;
    let changed = false;
    await this.prisma.$transaction(async (tx) => {
      const reserves = await tx.stockMovement.findMany({ where: { tenantId, orderId, type: 'RESERVE' } });
      const net = await this.netByVariant(tx, tenantId, orderId);
      for (const r of reserves) {
        const key = netKey(r.productId, r.variantId);
        if ((net.get(key)?.quantity ?? 0) < 0) continue;
        await this.applyDelta(tx, r.productId, r.variantId, r.quantity);
        await tx.stockMovement.create({
          data: { tenantId, orderId, productId: r.productId, variantId: r.variantId, type: 'RESERVE', quantity: r.quantity },
        });
        net.set(key, { productId: r.productId, variantId: r.variantId, quantity: r.quantity });
        changed = true;
      }
    });
    if (changed) {
      this.logger.warn(`El pedido ${input.orderNumber} se pagó después de vencer: se volvió a descontar su stock`);
      await this.cache.invalidateTenant(tenantId);
    }
  }

  /** Suma `delta` al producto y, si corresponde, a su variante (que puede haberse borrado). */
  private async applyDelta(tx: Prisma.TransactionClient, productId: string, variantId: string | null, delta: number) {
    if (variantId) {
      const updated = await tx.productVariant.updateMany({ where: { id: variantId }, data: { stock: { increment: delta } } });
      // Si el admin borró ese talle o color, el producto sigue sumando solo sus variantes vigentes.
      if (updated.count === 0) return;
    }
    await tx.product.updateMany({ where: { id: productId }, data: { stock: { increment: delta } } });
  }

  private async netByVariant(
    tx: Pick<Prisma.TransactionClient, 'stockMovement'>,
    tenantId: string,
    orderId: string,
  ): Promise<Map<string, NetMovement>> {
    const groups = await tx.stockMovement.groupBy({
      by: ['productId', 'variantId'],
      where: { tenantId, orderId },
      _sum: { quantity: true },
    });
    return new Map(
      groups.map((g) => [netKey(g.productId, g.variantId), { productId: g.productId, variantId: g.variantId, quantity: g._sum.quantity ?? 0 }]),
    );
  }
}
