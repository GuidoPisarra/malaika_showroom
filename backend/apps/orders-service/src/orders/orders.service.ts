import {
  BROKER,
  CATALOG,
  EVENTS,
  PAYMENTS,
  PaymentStatusChangedEvent,
  badRequest,
  calculateTotals,
  conflict,
  notFound,
  publish,
  resolveShipping,
  rpc,
} from '@malaika/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomInt } from 'node:crypto';
import { Prisma, type Coupon } from '../generated/prisma/client.js';
import { CouponsService } from '../coupons/coupons.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderWithItems, toOrderView } from './order.mapper.js';
import type { CancelReason, OrderStatusChangedEvent } from '@malaika/common';
import type { CatalogProduct, CreateOrderInput, OrderStatus } from './order.types.js';

const MAX_QTY_PER_LINE = 20;
const MAX_LINES = 50;

const TTL_HOURS = {
  MERCADO_PAGO: Number(process.env.ORDER_TTL_HOURS_MERCADO_PAGO ?? 2),
  BANK_TRANSFER: Number(process.env.ORDER_TTL_HOURS_BANK_TRANSFER ?? 48),
};

/** Cambios de estado que puede hacer el admin. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'SHIPPED', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    @Inject(BROKER) private readonly broker: ClientProxy,
  ) {}

  async create(input: CreateOrderInput) {
    const { tenant } = input;
    if (!input.items?.length) throw badRequest('El carrito está vacío');
    if (input.items.length > MAX_LINES) throw badRequest('El pedido tiene demasiados productos');

    // 1. Precios y datos siempre desde el catálogo, nunca desde el navegador.
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const products = await rpc<CatalogProduct[]>(this.broker, CATALOG.productsByIds, { tenantId: tenant.id, ids });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines = input.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product || !product.active) throw conflict('Uno de los productos ya no está disponible', 'PRODUCT_UNAVAILABLE');
      const quantity = Math.floor(item.quantity);
      if (quantity < 1 || quantity > MAX_QTY_PER_LINE) throw badRequest(`Cantidad inválida para "${product.name}"`);
      const size = item.size ?? product.sizes[0] ?? 'U';
      if (product.sizes.length && !product.sizes.includes(size)) {
        throw badRequest(`El talle ${size} no existe para "${product.name}"`);
      }
      const color = product.colors.find((c) => c.name === item.color) ?? product.colors[0] ?? { name: 'Único', hex: '#1C1917' };
      if (item.color && color.name !== item.color) throw badRequest(`El color ${item.color} no existe para "${product.name}"`);
      return { product, quantity, size, color };
    });

    // 2. Envío según la zona de la dirección, cupón y totales.
    const shippingQuote = resolveShipping(tenant.settings, input.customer);
    if (!shippingQuote.available) {
      throw badRequest('Por ahora no hacemos envíos a ese código postal', 'SHIPPING_UNAVAILABLE');
    }
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
    const coupon: Coupon | null = input.couponCode
      ? await this.coupons.findUsable(tenant.id, input.couponCode, subtotal)
      : null;
    const totals = calculateTotals(
      lines.map((l) => ({ unitPrice: l.product.price, quantity: l.quantity })),
      tenant.settings,
      coupon,
      input.paymentMethod,
      shippingQuote,
    );

    // 3. Pedido + uso del cupón en una sola transacción.
    const order = await this.createWithUniqueNumber(tenant.settings.orderPrefix, async (orderNumber) =>
      this.prisma.$transaction(async (tx) => {
        if (coupon) {
          const used = await tx.$executeRaw`
            UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
            WHERE id = ${coupon.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
          if (!used) throw badRequest('El cupón alcanzó su límite de usos', 'COUPON_INVALID');
        }
        return tx.order.create({
          include: { items: true },
          data: {
            tenantId: tenant.id,
            orderNumber,
            userId: input.userId ?? null,
            paymentMethod: input.paymentMethod,
            customerEmail: input.customer.email.trim().toLowerCase(),
            customerName: input.customer.fullName.trim(),
            shipping: {
              phone: input.customer.phone,
              address: input.customer.address,
              apartment: input.customer.apartment ?? '',
              city: input.customer.city,
              provinceState: input.customer.provinceState,
              postalCode: input.customer.postalCode,
              notes: input.customer.notes ?? '',
              zone: shippingQuote.zoneName,
              eta: shippingQuote.eta,
            },
            itemsCount: totals.itemsCount,
            subtotal: totals.subtotal,
            bundleDiscount: totals.bundleDiscount,
            couponCode: coupon?.code ?? null,
            couponDiscount: totals.couponDiscount,
            paymentDiscount: totals.paymentDiscount,
            shippingCost: totals.shipping,
            total: totals.total,
            currency: tenant.settings.currency,
            expiresAt: new Date(Date.now() + TTL_HOURS[input.paymentMethod] * 3600_000),
            items: {
              create: lines.map((l) => ({
                productId: l.product.id,
                name: l.product.name,
                image: l.product.image,
                unitPrice: l.product.price,
                quantity: l.quantity,
                size: l.size,
                colorName: l.color.name,
                colorHex: l.color.hex,
              })),
            },
          },
        });
      }),
    );

    // 4. Reserva de stock. Si falla, el pedido se descarta.
    try {
      await rpc(this.broker, CATALOG.reserveStock, {
        tenantId: tenant.id,
        orderId: order.id,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, size: l.size, color: l.color.name })),
      });
    } catch (err) {
      await this.discard(order);
      throw err;
    }
    await publish(this.broker, EVENTS.orderCreated, { tenantId: tenant.id, orderId: order.id, orderNumber: order.orderNumber });

    // 5. Cobro.
    if (input.paymentMethod === 'BANK_TRANSFER') {
      return { order: toOrderView(order), checkoutUrl: null, bankTransfer: tenant.settings.bankTransfer };
    }
    try {
      const checkout = await rpc<{ checkoutUrl: string }>(this.broker, PAYMENTS.createCheckout, {
        tenant,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          currency: order.currency,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          expiresAt: order.expiresAt?.toISOString(),
          itemsCount: order.itemsCount,
        },
      });
      return { order: toOrderView(order), checkoutUrl: checkout.checkoutUrl, bankTransfer: null };
    } catch (err) {
      await this.cancel(order, 'No se pudo iniciar el pago', 'payment-init-failed');
      throw err;
    }
  }

  async track(tenantId: string, orderNumber: string, email: string) {
    const order = await this.prisma.order.findFirst({
      where: { tenantId, orderNumber: orderNumber.trim().toUpperCase(), customerEmail: email.trim().toLowerCase() },
      include: { items: true },
    });
    if (!order) throw notFound('Pedido');
    return toOrderView(order);
  }

  async listMine(tenantId: string, userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map(toOrderView);
  }

  async adminList(input: { tenantId: string; status?: OrderStatus; search?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const where: Prisma.OrderWhereInput = {
      tenantId: input.tenantId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? {
            OR: [
              { orderNumber: { contains: input.search, mode: 'insensitive' } },
              { customerEmail: { contains: input.search, mode: 'insensitive' } },
              { customerName: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: orders.map(toOrderView), total, page, pageSize };
  }

  async adminGet(tenantId: string, id: string) {
    return toOrderView(await this.findOrThrow(tenantId, id));
  }

  async updateStatus(input: {
    tenantId: string;
    id: string;
    status: OrderStatus;
    trackingNumber?: string;
    adminNotes?: string;
  }) {
    const order = await this.findOrThrow(input.tenantId, input.id);
    const from = order.status as OrderStatus;
    if (from !== input.status && !TRANSITIONS[from].includes(input.status)) {
      throw badRequest(`No se puede pasar un pedido de ${from} a ${input.status}`, 'INVALID_TRANSITION');
    }

    if (input.status === 'CANCELLED' && from !== 'CANCELLED') {
      await this.cancel(order, 'Cancelado por el comercio', 'merchant');
    } else if (input.status === 'PAID' && from === 'PENDING_PAYMENT') {
      await this.markPaid(order, 'manual');
    }
    // El número de seguimiento se guarda antes de avisar el envío, así el email lo incluye.
    if (input.trackingNumber !== undefined || input.adminNotes !== undefined) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { trackingNumber: input.trackingNumber, adminNotes: input.adminNotes },
      });
    }
    if (from !== input.status && input.status !== 'CANCELLED' && input.status !== 'PAID') {
      await this.prisma.order.update({ where: { id: order.id }, data: { status: input.status } });
      if (input.status !== 'PENDING_PAYMENT') {
        await publish(this.broker, EVENTS.orderStatusChanged, {
          tenantId: order.tenantId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: input.status,
        } satisfies OrderStatusChangedEvent);
      }
    }
    return this.adminGet(input.tenantId, input.id);
  }

  /** Mercado Pago informó un cambio de estado en el pago de un pedido. */
  async onPaymentStatusChanged(event: PaymentStatusChangedEvent) {
    const order = await this.prisma.order.findFirst({
      where: { id: event.orderId, tenantId: event.tenantId },
      include: { items: true },
    });
    if (!order) {
      this.logger.warn(`Pago ${event.providerPaymentId} para un pedido inexistente (${event.orderId})`);
      return;
    }
    if (event.status === 'approved') {
      if (order.status === 'PENDING_PAYMENT' || order.status === 'CANCELLED') await this.markPaid(order, event.status);
      return;
    }
    await this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: event.status } });
  }

  /** Cancela los pedidos que no se pagaron a tiempo y libera su stock. */
  async expirePending(): Promise<number> {
    const expired = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', expiresAt: { lt: new Date() } },
      include: { items: true },
      take: 200,
    });
    for (const order of expired) await this.cancel(order, 'Venció sin pago', 'expired');
    return expired.length;
  }

  async dashboard(tenantId: string) {
    const since = (days: number) => new Date(Date.now() - days * 24 * 3600_000);
    const paidStatuses: OrderStatus[] = ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'];
    const [byStatus, last30, today] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
      this.prisma.order.aggregate({
        where: { tenantId, status: { in: paidStatuses }, paidAt: { gte: since(30) } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { tenantId, status: { in: paidStatuses }, paidAt: { gte: since(1) } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);
    return {
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      last30Days: { orders: last30._count._all, revenue: last30._sum.total ?? 0 },
      last24Hours: { orders: today._count._all, revenue: today._sum.total ?? 0 },
    };
  }

  private async markPaid(order: OrderWithItems, paymentStatus: string) {
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paymentStatus, paidAt: new Date(), cancelledAt: null },
    });
    await publish(this.broker, EVENTS.orderPaid, { tenantId: order.tenantId, orderId: order.id, orderNumber: order.orderNumber });
  }

  private async cancel(order: OrderWithItems, note: string, reason: CancelReason) {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), adminNotes: order.adminNotes ?? note },
      });
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { tenantId: order.tenantId, code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });
    await publish(this.broker, EVENTS.orderCancelled, {
      tenantId: order.tenantId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason,
    });
  }

  /** Borra un pedido que no llegó a reservar stock. */
  private async discard(order: OrderWithItems) {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.delete({ where: { id: order.id } });
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { tenantId: order.tenantId, code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });
  }

  private async findOrThrow(tenantId: string, id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({ where: { id, tenantId }, include: { items: true } });
    if (!order) throw notFound('Pedido');
    return order;
  }

  private async createWithUniqueNumber<T>(prefix: string, create: (orderNumber: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = `${prefix}-${randomInt(100000, 1000000)}`;
      try {
        return await create(orderNumber);
      } catch (err) {
        const target = (err as { code?: string; meta?: { target?: unknown } }).code;
        if (target !== 'P2002') throw err;
      }
    }
    throw conflict('No se pudo generar el número de pedido, intentá de nuevo');
  }
}
