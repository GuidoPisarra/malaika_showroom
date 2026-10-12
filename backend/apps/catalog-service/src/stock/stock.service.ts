import { conflict } from '@malaika/common';
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface StockLine {
  productId: string;
  quantity: number;
}

function mergeLines(lines: StockLine[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.quantity);
  return merged;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Reserva stock para un pedido de forma atómica: si algún producto no alcanza,
   * no se descuenta nada. Es idempotente por pedido.
   */
  async reserve(input: { tenantId: string; orderId: string; items: StockLine[] }): Promise<{ ok: true }> {
    const { tenantId, orderId } = input;
    await this.prisma.$transaction(async (tx) => {
      const already = await tx.stockMovement.count({ where: { tenantId, orderId, type: 'RESERVE' } });
      if (already) return;

      for (const [productId, quantity] of mergeLines(input.items)) {
        const updated = await tx.product.updateMany({
          where: { id: productId, tenantId, active: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (updated.count === 0) {
          const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
          throw conflict(
            product
              ? `No hay stock suficiente de "${product.name}" (quedan ${product.stock})`
              : 'Uno de los productos ya no está disponible',
            'OUT_OF_STOCK',
          );
        }
        await tx.stockMovement.create({ data: { tenantId, orderId, productId, type: 'RESERVE', quantity: -quantity } });
      }
    });
    await this.cache.invalidateTenant(tenantId);
    return { ok: true };
  }

  /** Devuelve al stock lo que tenga reservado un pedido cancelado o vencido. */
  async release(input: { tenantId: string; orderId: string }): Promise<void> {
    const { tenantId, orderId } = input;
    await this.prisma.$transaction(async (tx) => {
      for (const [productId, net] of await this.netByProduct(tx, tenantId, orderId)) {
        if (net >= 0) continue;
        await tx.product.update({ where: { id: productId }, data: { stock: { increment: -net } } });
        await tx.stockMovement.create({ data: { tenantId, orderId, productId, type: 'RELEASE', quantity: -net } });
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
      const net = await this.netByProduct(tx, tenantId, orderId);
      for (const r of reserves) {
        if ((net.get(r.productId) ?? 0) < 0) continue;
        await tx.product.update({ where: { id: r.productId }, data: { stock: { increment: r.quantity } } });
        await tx.stockMovement.create({
          data: { tenantId, orderId, productId: r.productId, type: 'RESERVE', quantity: r.quantity },
        });
        net.set(r.productId, r.quantity);
        changed = true;
      }
    });
    if (changed) {
      this.logger.warn(`El pedido ${input.orderNumber} se pagó después de vencer: se volvió a descontar su stock`);
      await this.cache.invalidateTenant(tenantId);
    }
  }

  private async netByProduct(
    tx: Pick<PrismaService, 'stockMovement'>,
    tenantId: string,
    orderId: string,
  ): Promise<Map<string, number>> {
    const groups = await tx.stockMovement.groupBy({
      by: ['productId'],
      where: { tenantId, orderId },
      _sum: { quantity: true },
    });
    return new Map(groups.map((g) => [g.productId, g._sum.quantity ?? 0]));
  }
}
