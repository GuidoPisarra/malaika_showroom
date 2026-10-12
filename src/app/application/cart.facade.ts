import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, CartSummary, CouponDiscount } from '../domain/cart/models/cart-item.model';
import { Product, ProductColor } from '../domain/catalog/models/product.model';
import { CartCalculatorDomainService } from '../domain/cart/services/cart-calculator.domain-service';
import { API_BASE_URL, apiErrorMessage } from '../infrastructure/http/api.config';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';
import { StoreFacade } from './store.facade';

@Injectable({
  providedIn: 'root',
})
export class CartFacade {
  private calculator = inject(CartCalculatorDomainService);
  private storage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private store = inject(StoreFacade);

  // State
  readonly items = signal<CartItem[]>([]);
  readonly isCartDrawerOpen = signal<boolean>(false);
  readonly appliedCoupon = signal<CouponDiscount | null>(null);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);
  readonly isValidatingCoupon = signal<boolean>(false);

  // Cart summary computed
  readonly summary = computed<CartSummary>(() => {
    return this.calculator.calculateSummary(this.items(), this.appliedCoupon(), this.store.settings());
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

  /** Actualiza precios y stock del carrito guardado con el catálogo vigente y quita lo que ya no existe. */
  syncWithCatalog(products: Product[]): void {
    const byId = new Map(products.map((p) => [p.id, p]));
    const current = this.items();
    const synced = current
      .filter((item) => byId.has(item.product.id))
      .map((item) => ({ ...item, product: byId.get(item.product.id)! }));
    const changed =
      synced.length !== current.length || synced.some((item, i) => item.product.price !== current[i].product.price);
    this.items.set(synced);
    if (changed) this.persistCart();
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
      this.couponError.set('Ingresá un código promocional.');
      return;
    }

    this.isValidatingCoupon.set(true);
    this.http
      .post<CouponDiscount>(`${this.api}/coupons/validate`, { code: sanitized, subtotal: this.summary().subtotal })
      .subscribe({
        next: (coupon) => {
          this.isValidatingCoupon.set(false);
          this.appliedCoupon.set(coupon);
          this.couponSuccess.set(`¡Cupón ${coupon.code} aplicado con éxito!`);
        },
        error: (err) => {
          this.isValidatingCoupon.set(false);
          this.couponError.set(apiErrorMessage(err, 'Código no válido o vencido.'));
        },
      });
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
