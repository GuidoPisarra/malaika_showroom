import { Injectable } from '@angular/core';
import { CartItem, CartSummary, CouponDiscount } from '../models/cart-item.model';
import { FALLBACK_STORE_SETTINGS, ShippingQuote, StoreSettings } from '../../store/store-settings.model';

/**
 * Muestra el mismo cálculo que hace el backend (libs/common/src/pricing.ts).
 * El monto que se cobra siempre lo calcula el servidor; esto es para la vista.
 */
@Injectable({
  providedIn: 'root',
})
export class CartCalculatorDomainService {
  bundlePercent(itemsCount: number, settings: StoreSettings = FALLBACK_STORE_SETTINGS): number {
    return settings.bundleDiscounts
      .filter((t) => itemsCount >= t.minItems)
      .reduce((best, t) => Math.max(best, t.percent), 0);
  }

  calculateSummary(
    items: CartItem[],
    coupon?: CouponDiscount | null,
    settings: StoreSettings = FALLBACK_STORE_SETTINGS,
    shippingQuote: ShippingQuote | null = null,
  ): CartSummary {
    // Sin dirección todavía se usa el costo general; con código postal, el de su zona.
    const shippingFee = shippingQuote?.fee ?? settings.shippingFee;
    const freeShippingThreshold = shippingQuote?.freeShippingThreshold ?? settings.freeShippingThreshold;
    // Un mínimo de 0 en una zona significa que ahí el envío nunca es gratis.
    const qualifiesForFree = (amount: number) => freeShippingThreshold > 0 && amount >= freeShippingThreshold;
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const bundleDiscount = Math.round((subtotal * this.bundlePercent(itemsCount, settings)) / 100);

    let couponDiscount = 0;
    if (coupon) {
      if (coupon.percent) {
        couponDiscount = Math.round(((subtotal - bundleDiscount) * coupon.percent) / 100);
      } else if (coupon.fixedAmount) {
        couponDiscount = Math.min(subtotal - bundleDiscount, coupon.fixedAmount);
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - bundleDiscount - couponDiscount);
    const shipping = itemsCount === 0 || qualifiesForFree(discountedSubtotal) ? 0 : shippingFee;

    return {
      itemsCount,
      subtotal,
      bundleDiscount,
      couponDiscount,
      shipping,
      total: discountedSubtotal + shipping,
      freeShippingThreshold,
      freeShippingRemaining: freeShippingThreshold > 0 ? Math.max(0, freeShippingThreshold - discountedSubtotal) : 0,
      freeShippingAvailable: freeShippingThreshold > 0,
    };
  }
}
