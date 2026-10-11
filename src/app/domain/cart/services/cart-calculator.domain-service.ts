import { Injectable } from '@angular/core';
import { CartItem, CartSummary, CouponDiscount } from '../models/cart-item.model';

@Injectable({
  providedIn: 'root',
})
export class CartCalculatorDomainService {
  private readonly FREE_SHIPPING_LIMIT = 150000;
  private readonly STANDARD_SHIPPING_FEE = 15000;

  calculateSummary(items: CartItem[], coupon?: CouponDiscount | null): CartSummary {
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    // Bundle discount if 3+ items
    const bundleDiscountPercent = itemsCount >= 3 ? 0.15 : itemsCount === 2 ? 0.05 : 0;
    const bundleDiscount = Math.round(subtotal * bundleDiscountPercent * 100) / 100;

    let couponDiscount = 0;
    if (coupon) {
      if (coupon.percent) {
        couponDiscount = Math.round((subtotal - bundleDiscount) * (coupon.percent / 100) * 100) / 100;
      } else if (coupon.fixedAmount) {
        couponDiscount = Math.min(subtotal, coupon.fixedAmount);
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - bundleDiscount - couponDiscount);
    const shipping = discountedSubtotal >= this.FREE_SHIPPING_LIMIT || itemsCount === 0 ? 0 : this.STANDARD_SHIPPING_FEE;
    const total = discountedSubtotal + shipping;

    const freeShippingRemaining = Math.max(0, this.FREE_SHIPPING_LIMIT - discountedSubtotal);

    return {
      itemsCount,
      subtotal,
      bundleDiscount,
      couponDiscount,
      shipping,
      total: Math.round(total * 100) / 100,
      freeShippingThreshold: this.FREE_SHIPPING_LIMIT,
      freeShippingRemaining: Math.round(freeShippingRemaining * 100) / 100,
    };
  }
}
