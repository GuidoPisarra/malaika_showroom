import type { Order, OrderItem } from '../generated/prisma/client.js';

export type OrderWithItems = Order & { items: OrderItem[] };

export function toOrderView(o: OrderWithItems) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    currency: o.currency,
    customer: { ...(o.shipping as object), email: o.customerEmail, fullName: o.customerName },
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      image: i.image,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      size: i.size,
      color: { name: i.colorName, hex: i.colorHex },
    })),
    totals: {
      itemsCount: o.itemsCount,
      subtotal: o.subtotal,
      bundleDiscount: o.bundleDiscount,
      couponCode: o.couponCode,
      couponDiscount: o.couponDiscount,
      paymentDiscount: o.paymentDiscount,
      shipping: o.shippingCost,
      total: o.total,
    },
    trackingNumber: o.trackingNumber,
    adminNotes: o.adminNotes,
    createdAt: o.createdAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    expiresAt: o.expiresAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
  };
}

export type OrderView = ReturnType<typeof toOrderView>;
