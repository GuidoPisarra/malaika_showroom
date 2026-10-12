import type { OrderView } from './types.js';

/** Pedido de ejemplo para la vista previa del panel. */
export function sampleOrder(currency: string, paymentMethod: OrderView['paymentMethod'] = 'MERCADO_PAGO'): OrderView {
  const now = Date.now();
  return {
    id: 'ejemplo',
    orderNumber: 'MLK-123456',
    status: paymentMethod === 'BANK_TRANSFER' ? 'PENDING_PAYMENT' : 'PAID',
    paymentMethod,
    currency,
    customer: {
      fullName: 'Lucía Fernández',
      email: 'lucia@ejemplo.com',
      phone: '11 5555 4444',
      address: 'Av. Santa Fe 1234',
      apartment: '4° B',
      city: 'CABA',
      provinceState: 'Ciudad Autónoma de Buenos Aires',
      postalCode: 'C1425',
      zone: 'CABA',
      eta: '24 a 48 h hábiles',
    },
    items: [
      { name: 'Vestido de seda', image: '', unitPrice: 185000, quantity: 1, size: 'M', color: { name: 'Negro', hex: '#111111' } },
      { name: 'Aros de perlas', image: '', unitPrice: 42000, quantity: 1, size: 'U', color: { name: 'Dorado', hex: '#d4af37' } },
    ],
    totals: {
      itemsCount: 2,
      subtotal: 227000,
      bundleDiscount: 11350,
      couponCode: null,
      couponDiscount: 0,
      paymentDiscount: paymentMethod === 'BANK_TRANSFER' ? 10783 : 0,
      shipping: 0,
      total: paymentMethod === 'BANK_TRANSFER' ? 204867 : 215650,
    },
    trackingNumber: 'AR123456789',
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 48 * 3600_000).toISOString(),
  };
}
