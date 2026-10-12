import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartFacade } from '../../../application/cart.facade';
import { CheckoutFacade } from '../../../application/checkout.facade';
import { ShippingFacade } from '../../../application/shipping.facade';
import { ArsCurrencyPipe } from '../../shared/pipes/ars-currency.pipe';

@Component({
  selector: 'app-cart-drawer',
  imports: [CommonModule, FormsModule, ArsCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cartFacade.isCartDrawerOpen()) {
      <div
        id="cart-drawer-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Bolsa de Compras"
        class="fixed inset-0 z-50 overflow-hidden bg-stone-950/60 backdrop-blur-xs flex justify-end animate-fadeIn"
      >
        <!-- Backdrop click target -->
        <button
          type="button"
          class="fixed inset-0 bg-transparent w-full h-full cursor-default"
          (click)="cartFacade.closeCart()"
          aria-label="Cerrar fondo de bolsa"
        ></button>

        <div
          id="cart-drawer-panel"
          class="w-full max-w-md bg-[#FAF8F5] h-full shadow-2xl flex flex-col justify-between border-l border-stone-200 animate-slideLeft relative z-10"
        >
          <!-- Header -->
          <div class="p-5 border-b border-stone-200/80 bg-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-stone-900 text-2xl">shopping_bag</span>
              <h3 class="font-display text-xl text-stone-900 font-medium">
                Tu Bolsa de Compras
              </h3>
              <span class="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
                {{ cartFacade.totalItemsCount() }}
              </span>
            </div>

            <button
              (click)="cartFacade.closeCart()"
              class="text-stone-400 hover:text-stone-800 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Cerrar bolsa"
            >
              <span class="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <!-- Free Shipping Progress Indicator -->
          <div class="bg-amber-50 px-5 py-3 border-b border-amber-200/60 text-xs">
            @if (!cartFacade.summary().freeShippingAvailable) {
              <div class="flex items-center gap-2 text-stone-700">
                <span class="material-symbols-outlined text-base text-amber-700">local_shipping</span>
                <span>Envío a tu zona: <strong>{{ cartFacade.summary().shipping | arsCurrency }}</strong></span>
              </div>
            } @else if (cartFacade.summary().freeShippingRemaining === 0 && cartFacade.items().length > 0) {
              <div class="flex items-center gap-2 text-emerald-800 font-medium">
                <span class="material-symbols-outlined text-base text-emerald-600">check_circle</span>
                <span>¡Felicidades! Has desbloqueado <strong>ENVÍO GRATIS</strong>.</span>
              </div>
            } @else {
              <div class="space-y-1.5">
                <div class="flex items-center justify-between text-stone-700">
                  <span>Agrega <strong>{{ cartFacade.summary().freeShippingRemaining | arsCurrency }}</strong> más para Envío Gratis</span>
                  <span class="font-bold text-amber-900 font-mono text-[11px]">{{ cartFacade.summary().freeShippingThreshold | arsCurrency }}</span>
                </div>
                <div class="w-full h-1.5 bg-amber-200/70 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-amber-700 transition-all duration-300 rounded-full"
                    [style.width.%]="shippingProgressPercent()"
                  ></div>
                </div>
              </div>
            }
          </div>

          @if (cartFacade.stockNotice(); as notice) {
            <div class="mx-5 mt-4 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2" role="status">
              <span class="material-symbols-outlined text-base text-rose-600">inventory</span>
              <span class="flex-1">{{ notice }}</span>
              <button type="button" (click)="cartFacade.dismissStockNotice()" class="text-rose-500 hover:text-rose-800" aria-label="Cerrar aviso">
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          }

          <!-- Items List (Scrollable) -->
          <div class="flex-1 overflow-y-auto p-5 space-y-3.5">
            @if (cartFacade.isCartEmpty()) {
              <div class="text-center py-16 space-y-3">
                <div class="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                  <span class="material-symbols-outlined text-3xl">shopping_basket</span>
                </div>
                <h4 class="font-serif text-lg text-stone-700">Tu bolsa está vacía</h4>
                <p class="text-xs text-stone-500 max-w-xs mx-auto font-light">
                  Explora nuestra colección o diseña un outfit completo en el Maniquí Virtual.
                </p>
                <div class="pt-2">
                  <button
                    (click)="cartFacade.closeCart()"
                    class="px-5 py-2.5 bg-stone-900 text-amber-200 rounded-full text-xs font-semibold tracking-wider uppercase shadow-sm"
                  >
                    Ver Colección
                  </button>
                </div>
              </div>
            } @else {
              @for (item of cartFacade.items(); track item.id) {
                <div class="flex gap-3 bg-white p-3.5 rounded-2xl border border-stone-200/70 shadow-xs relative">
                  <!-- Thumbnail -->
                  <img
                    [src]="item.product.image"
                    [alt]="item.product.name"
                    class="w-18 h-22 object-cover rounded-xl bg-stone-100 shrink-0"
                  />

                  <!-- Info -->
                  <div class="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div class="flex items-start justify-between gap-2">
                        <h4 class="font-display text-sm font-semibold text-stone-900 truncate">
                          {{ item.product.name }}
                        </h4>
                        <button
                          (click)="cartFacade.removeItem(item.id)"
                          class="text-stone-400 hover:text-rose-600 p-0.5"
                          title="Eliminar"
                        >
                          <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>

                      <p class="text-[11px] text-stone-500 mt-0.5">
                        Talle: <strong class="text-stone-700">{{ item.selectedSize }}</strong> •
                        Tono: <span class="inline-block w-2.5 h-2.5 rounded-full border border-stone-300 align-middle ml-0.5" [style.backgroundColor]="item.selectedColor.hex"></span>
                      </p>
                    </div>

                    <!-- Price & Quantity Controls -->
                    <div class="flex items-center justify-between pt-2">
                      <span class="text-sm font-bold font-mono text-stone-900">
                        {{ item.product.price * item.quantity | arsCurrency }}
                      </span>

                      <div class="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                        <button
                          type="button"
                          (click)="cartFacade.updateQuantity(item.id, -1)"
                          class="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-stone-900 font-bold"
                          title="Reducir"
                        >
                          -
                        </button>
                        <span class="text-xs font-mono px-2 font-semibold text-stone-800">
                          {{ item.quantity }}
                        </span>
                        <button
                          type="button"
                          (click)="cartFacade.updateQuantity(item.id, 1)"
                          [disabled]="!cartFacade.canIncrease(item)"
                          class="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-stone-900 disabled:text-stone-300 disabled:cursor-not-allowed font-bold"
                          [title]="cartFacade.canIncrease(item) ? 'Aumentar' : 'No hay más stock'"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Coupon & Checkout Footer -->
          @if (!cartFacade.isCartEmpty()) {
            <div class="p-5 border-t border-stone-200 bg-white space-y-4">
              <!-- Coupon Input -->
              <div>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="couponInput"
                    placeholder="Código de descuento (ej. MALAIKA10)"
                    class="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase focus:outline-none focus:border-amber-700 font-mono"
                  />
                  <button
                    type="button"
                    (click)="applyCouponCode()"
                    class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-semibold rounded-xl uppercase tracking-wider"
                  >
                    Aplicar
                  </button>
                </div>
                @if (cartFacade.couponSuccess(); as msg) {
                  <p class="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">check</span>
                    <span>{{ msg }}</span>
                  </p>
                }
                @if (cartFacade.couponError(); as err) {
                  <p class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">error</span>
                    <span>{{ err }}</span>
                  </p>
                }
              </div>

              <!-- Price Breakdown -->
              <div class="space-y-1.5 text-xs text-stone-600 pt-1">
                <div class="flex justify-between">
                  <span>Subtotal</span>
                  <span class="font-mono text-stone-900 font-medium">{{ cartFacade.summary().subtotal | arsCurrency }}</span>
                </div>

                @if (cartFacade.summary().bundleDiscount > 0) {
                  <div class="flex justify-between text-amber-800 font-medium">
                    <span>Descuento Pack Look (15%)</span>
                    <span class="font-mono">-{{ cartFacade.summary().bundleDiscount | arsCurrency }}</span>
                  </div>
                }

                @if (cartFacade.summary().couponDiscount > 0) {
                  <div class="flex justify-between text-emerald-700 font-medium">
                    <span>Cupón ({{ cartFacade.appliedCoupon()?.code }})</span>
                    <span class="font-mono">-{{ cartFacade.summary().couponDiscount | arsCurrency }}</span>
                  </div>
                }

                <div class="flex justify-between">
                  <span>Envío</span>
                  @if (cartFacade.summary().shipping === 0) {
                    <span class="font-mono">GRATIS</span>
                  } @else if (shippingFacade.hasZones() && !shippingFacade.quote()) {
                    <span class="text-right">
                      <span class="font-mono">desde {{ shippingFacade.cheapestFee() | arsCurrency }}</span>
                      <span class="block text-[10px] text-stone-400">se calcula con tu código postal</span>
                    </span>
                  } @else {
                    <span class="font-mono">{{ cartFacade.summary().shipping | arsCurrency }}</span>
                  }
                </div>

                <div class="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
                  <span>Total Final</span>
                  <span class="font-mono text-lg text-amber-900">{{ cartFacade.summary().total | arsCurrency }}</span>
                </div>
              </div>

              <!-- Checkout Trigger Button -->
              <button
                id="btn-trigger-checkout"
                type="button"
                (click)="startCheckout()"
                class="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-amber-200 text-xs font-bold tracking-widest uppercase rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span class="material-symbols-outlined text-base">lock</span>
                <span>Finalizar Compra Segura</span>
              </button>

              <div class="flex items-center justify-center gap-3 text-[10px] text-stone-400">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs text-emerald-600">verified</span>
                  <span>Pago Encriptado SSL</span>
                </span>
                <span>•</span>
                <span>Garantía de Devolución 30 días</span>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class CartDrawerComponent {
  readonly cartFacade = inject(CartFacade);
  readonly checkoutFacade = inject(CheckoutFacade);
  readonly shippingFacade = inject(ShippingFacade);

  couponInput = '';

  shippingProgressPercent(): number {
    const subtotal = this.cartFacade.summary().subtotal;
    const threshold = this.cartFacade.summary().freeShippingThreshold;
    return threshold > 0 ? Math.min(100, Math.round((subtotal / threshold) * 100)) : 0;
  }

  applyCouponCode(): void {
    this.cartFacade.applyCoupon(this.couponInput);
  }

  startCheckout(): void {
    this.checkoutFacade.openCheckout();
  }
}
