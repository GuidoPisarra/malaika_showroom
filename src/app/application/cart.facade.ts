import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, CartSummary, CouponDiscount } from '../domain/cart/models/cart-item.model';
import { Product, ProductColor } from '../domain/catalog/models/product.model';
import { CartCalculatorDomainService } from '../domain/cart/services/cart-calculator.domain-service';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class CartFacade {
  private calculator = inject(CartCalculatorDomainService);
  private storage = inject(LocalStorageService);

  // State
  readonly items = signal<CartItem[]>([]);
  readonly isCartDrawerOpen = signal<boolean>(false);
  readonly appliedCoupon = signal<CouponDiscount | null>(null);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);

  // Cart summary computed
  readonly summary = computed<CartSummary>(() => {
    return this.calculator.calculateSummary(this.items(), this.appliedCoupon());
  });

  readonly totalItemsCount = computed(() => this.summary().itemsCount);
  readonly isCartEmpty = computed(() => this.items().length === 0);

  constructor() {
    this.loadCart();
  }

  private loadCart(): void {
    const saved = this.storage.getItem<CartItem[]>('mlk_cart_items', []);
    this.items.set(saved);
  }

  private persistCart(): void {
    this.storage.setItem('mlk_cart_items', this.items());
  }

  addItem(product: Product, size?: string, color?: ProductColor, quantity = 1, isBundlePart = false): void {
    const chosenSize = size || product.sizes[0] || 'U';
    const chosenColor = color || product.colors[0] || { name: 'Estándar', hex: '#1C1917' };
    const cartItemId = `${product.id}_${chosenSize}_${chosenColor.name}`;

    this.items.update((current) => {
      const existingIdx = current.findIndex((item) => item.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...current];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + quantity,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          product,
          quantity,
          selectedSize: chosenSize,
          selectedColor: chosenColor,
          isBundlePart,
        };
        return [...current, newItem];
      }
    });

    this.persistCart();
    this.isCartDrawerOpen.set(true);
  }

  addOutfitBundle(products: Product[]): void {
    if (products.length === 0) return;

    products.forEach((prod) => {
      this.addItem(prod, prod.sizes[0], prod.colors[0], 1, true);
    });

    this.isCartDrawerOpen.set(true);
  }

  updateQuantity(cartItemId: string, delta: number): void {
    this.items.update((current) => {
      return current
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });

    this.persistCart();
  }

  removeItem(cartItemId: string): void {
    this.items.update((current) => current.filter((item) => item.id !== cartItemId));
    this.persistCart();
  }

  clearCart(): void {
    this.items.set([]);
    this.appliedCoupon.set(null);
    this.persistCart();
  }

  applyCoupon(code: string): void {
    this.couponError.set(null);
    this.couponSuccess.set(null);
    const sanitized = code.trim().toUpperCase();

    if (!sanitized) {
      this.couponError.set('Ingresa un código promocional.');
      return;
    }

    if (sanitized === 'MALAIKA10') {
      this.appliedCoupon.set({
        code: 'MALAIKA10',
        percent: 10,
        description: '10% de descuento especial en tu orden',
      });
      this.couponSuccess.set('¡Cupón MALAIKA10 aplicado con éxito!');
    } else if (sanitized === 'VIP20') {
      this.appliedCoupon.set({
        code: 'VIP20',
        percent: 20,
        description: '20% de descuento exclusivo VIP',
      });
      this.couponSuccess.set('¡Cupón VIP20 aplicado con éxito!');
    } else if (sanitized === 'BIENVENIDA') {
      this.appliedCoupon.set({
        code: 'BIENVENIDA',
        percent: 0,
        fixedAmount: 20000,
        description: 'Descuento de bienvenida de $20.000',
      });
      this.couponSuccess.set('¡Cupón de bienvenida de $20.000 aplicado!');
    } else {
      this.couponError.set('Código no válido o vencido. Prueba con "MALAIKA10".');
    }
  }

  removeCoupon(): void {
    this.appliedCoupon.set(null);
    this.couponSuccess.set(null);
    this.couponError.set(null);
  }

  openCart(): void {
    this.isCartDrawerOpen.set(true);
  }

  closeCart(): void {
    this.isCartDrawerOpen.set(false);
  }
}
