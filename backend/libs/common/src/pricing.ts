import { StoreSettings } from './tenant.js';

export type PaymentMethod = 'MERCADO_PAGO' | 'BANK_TRANSFER';

export interface PricingLine {
  unitPrice: number;
  quantity: number;
}

export interface CouponRule {
  code: string;
  percent: number | null;
  fixedAmount: number | null;
}

export interface OrderTotals {
  itemsCount: number;
  subtotal: number;
  bundleDiscount: number;
  couponDiscount: number;
  paymentDiscount: number;
  shipping: number;
  total: number;
  freeShippingThreshold: number;
  freeShippingRemaining: number;
}

const round = (n: number) => Math.round(n);

export function bundlePercent(itemsCount: number, settings: StoreSettings): number {
  return settings.bundleDiscounts
    .filter((t) => itemsCount >= t.minItems)
    .reduce((best, t) => Math.max(best, t.percent), 0);
}

/**
 * Calcula los totales de un pedido. Es la fuente de verdad: el front muestra
 * el mismo cálculo, pero el precio que se cobra siempre sale de acá.
 * Montos redondeados a unidades enteras de la moneda.
 */
export function calculateTotals(
  lines: PricingLine[],
  settings: StoreSettings,
  coupon: CouponRule | null,
  paymentMethod: PaymentMethod | null,
): OrderTotals {
  const itemsCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const bundleDiscount = round((subtotal * bundlePercent(itemsCount, settings)) / 100);

  let couponDiscount = 0;
  if (coupon) {
    if (coupon.percent) {
      couponDiscount = round(((subtotal - bundleDiscount) * coupon.percent) / 100);
    } else if (coupon.fixedAmount) {
      couponDiscount = Math.min(subtotal - bundleDiscount, coupon.fixedAmount);
    }
  }

  const discounted = Math.max(0, subtotal - bundleDiscount - couponDiscount);
  const shipping =
    itemsCount === 0 || discounted >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
  const beforePayment = discounted + shipping;
  const paymentDiscount =
    paymentMethod === 'BANK_TRANSFER'
      ? round((beforePayment * settings.bankTransferDiscountPercent) / 100)
      : 0;

  return {
    itemsCount,
    subtotal,
    bundleDiscount,
    couponDiscount,
    paymentDiscount,
    shipping,
    total: Math.max(0, beforePayment - paymentDiscount),
    freeShippingThreshold: settings.freeShippingThreshold,
    freeShippingRemaining: Math.max(0, settings.freeShippingThreshold - discounted),
  };
}
