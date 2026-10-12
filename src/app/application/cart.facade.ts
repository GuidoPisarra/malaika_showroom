import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CartItem, CartSummary, CouponDiscount } from '../domain/cart/models/cart-item.model';
import { Product, ProductColor } from '../domain/catalog/models/product.model';
import { CartCalculatorDomainService } from '../domain/cart/services/cart-calculator.domain-service';
import { availableStock, firstAvailableSelection } from '../domain/catalog/services/variant-stock';
import { API_BASE_URL, apiErrorMessage } from '../infrastructure/http/api.config';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';
import { ShippingFacade } from './shipping.facade';
import { StoreFacade } from './store.facade';

const DEFAULT_COLOR: ProductColor = { name: 'Estándar', hex: '#1C1917' };

/** Clave con la que se cuenta el stock: por variante, o por producto si el stock es general. */
function stockKey(item: Pick<CartItem, 'product' | 'selectedSize' | 'selectedColor'>): string {
  return item.product.variantStock
    ? `${item.product.id}_${item.selectedSize}_${item.selectedColor.name}`
    : item.product.id;
}

function variantLabel(product: Product, size: string, color: ProductColor): string {
  const parts = [product.sizes.length > 1 ? `talle ${size}` : '', product.colors.length > 1 ? color.name : ''].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

@Injectable({
  providedIn: 'root',
})
export class CartFacade {
  private calculator = inject(CartCalculatorDomainService);
  private storage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private api = inject(API_BASE_URL);
  private store = inject(StoreFacade);
  private shippingFacade = inject(ShippingFacade);

  // State
  readonly items = signal<CartItem[]>([]);
  readonly isCartDrawerOpen = signal<boolean>(false);
  readonly appliedCoupon = signal<CouponDiscount | null>(null);
  readonly couponError = signal<string | null>(null);
  readonly couponSuccess = signal<string | null>(null);
  readonly isValidatingCoupon = signal<boolean>(false);
  /** Aviso cuando no se pudo agregar (o se ajustó) una prenda por falta de stock. */
  readonly stockNotice = signal<string | null>(null);

  // Cart summary computed
  readonly summary = computed<CartSummary>(() => {
    return this.calculator.calculateSummary(
      this.items(),
      this.appliedCoupon(),
      this.store.settings(),
      this.shippingFacade.quote(),
    );
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

  /**
   * Agrega una prenda a la bolsa. Sin talle o color elegidos usa la primera
   * combinación con stock. Nunca supera el stock disponible: devuelve false si
   * no se pudo agregar nada.
   */
  addItem(product: Product, size?: string, color?: ProductColor, quantity = 1, isBundlePart = false): boolean {
    const pick = firstAvailableSelection(product, { size, color });
    const chosenSize = size || pick.size || 'U';
    const chosenColor = color || pick.color || DEFAULT_COLOR;
    const cartItemId = `${product.id}_${chosenSize}_${chosenColor.name}`;

    const key = stockKey({ product, selectedSize: chosenSize, selectedColor: chosenColor });
    const inCart = this.items()
      .filter((item) => stockKey(item) === key)
      .reduce((sum, item) => sum + item.quantity, 0);
    const room = availableStock(product, chosenSize, chosenColor.name) - inCart;
    const label = `"${product.name}"${variantLabel(product, chosenSize, chosenColor)}`;
    if (room <= 0) {
      this.stockNotice.set(inCart ? `Ya tenés en la bolsa todo el stock de ${label}.` : `${label} está agotado.`);
      this.isCartDrawerOpen.set(true);
      return false;
    }
    const toAdd = Math.min(quantity, room);
    this.stockNotice.set(toAdd < quantity ? `Solo quedaban ${toAdd} de ${label}.` : null);

    this.items.update((current) => {
      const existingIdx = current.findIndex((item) => item.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...current];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + toAdd,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          product,
          quantity: toAdd,
          selectedSize: chosenSize,
          selectedColor: chosenColor,
          isBundlePart,
        };
        return [...current, newItem];
      }
    });

    this.persistCart();
    this.isCartDrawerOpen.set(true);
    return true;
  }

  addOutfitBundle(products: Product[]): void {
    if (products.length === 0) return;

    const missing = products.filter((prod) => !this.addItem(prod, undefined, undefined, 1, true));
    if (missing.length) {
      this.stockNotice.set(`Sin stock por ahora: ${missing.map((p) => p.name).join(', ')}. Sumamos el resto del look.`);
    }

    this.isCartDrawerOpen.set(true);
  }

  /**
   * Actualiza precios y stock del carrito guardado con el catálogo vigente:
   * quita lo que ya no existe y ajusta cantidades al stock disponible.
   */
  syncWithCatalog(products: Product[]): void {
    const byId = new Map(products.map((p) => [p.id, p]));
    const current = this.items();
    const used = new Map<string, number>();
    const adjusted: string[] = [];
    const synced: CartItem[] = [];
    for (const item of current) {
      const product = byId.get(item.product.id);
      if (!product) continue;
      const next = { ...item, product };
      const key = stockKey(next);
      const room = availableStock(product, item.selectedSize, item.selectedColor.name) - (used.get(key) ?? 0);
      const quantity = Math.min(item.quantity, Math.max(0, room));
      if (quantity !== item.quantity) adjusted.push(product.name);
      if (quantity === 0) continue;
      used.set(key, (used.get(key) ?? 0) + quantity);
      synced.push({ ...next, quantity });
    }
    const changed =
      synced.length !== current.length ||
      synced.some((item, i) => item.product.price !== current[i].product.price || item.quantity !== current[i].quantity);
    this.items.set(synced);
    if (adjusted.length) {
      this.stockNotice.set(`Ajustamos tu bolsa porque cambió el stock de: ${[...new Set(adjusted)].join(', ')}.`);
    }
    if (changed) this.persistCart();
  }

  updateQuantity(cartItemId: string, delta: number): void {
    const target = this.items().find((item) => item.id === cartItemId);
    if (target && delta > 0 && !this.canIncrease(target)) {
      this.stockNotice.set(
        `No queda más stock de "${target.product.name}"${variantLabel(target.product, target.selectedSize, target.selectedColor)}.`,
      );
      return;
    }
    this.stockNotice.set(null);
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

  /** true si se puede sumar una unidad más de esa línea sin pasarse del stock. */
  canIncrease(item: CartItem): boolean {
    const key = stockKey(item);
    const inCart = this.items()
      .filter((other) => stockKey(other) === key)
      .reduce((sum, other) => sum + other.quantity, 0);
    return availableStock(item.product, item.selectedSize, item.selectedColor.name) > inCart;
  }

  dismissStockNotice(): void {
    this.stockNotice.set(null);
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
