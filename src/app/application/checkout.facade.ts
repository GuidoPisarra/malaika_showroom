import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import confetti from 'canvas-confetti';
import { PaymentValidatorDomainService } from '../domain/checkout/services/payment-validator.domain-service';
import { Order, PaymentMethodType, ShippingData } from '../domain/checkout/models/order.model';
import { BankTransferInfo } from '../domain/store/store-settings.model';
import { AuthSessionService } from '../infrastructure/auth/auth-session.service';
import { apiErrorMessage } from '../infrastructure/http/api.config';
import { OrdersApiService } from '../infrastructure/http/orders-api.service';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';
import { CartFacade } from './cart.facade';
import { CatalogFacade } from './catalog.facade';
import { StoreFacade } from './store.facade';

export type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

/** Lo que guardamos antes de ir a Mercado Pago para reconocer el pedido a la vuelta. */
interface PendingCheckout {
  orderNumber: string;
  email: string;
}

const PENDING_KEY = 'mlk_pending_checkout';
const SHIPPING_KEY = 'mlk_last_shipping';

@Injectable({
  providedIn: 'root',
})
export class CheckoutFacade {
  private orders = inject(OrdersApiService);
  private validator = inject(PaymentValidatorDomainService);
  private cartFacade = inject(CartFacade);
  private catalogFacade = inject(CatalogFacade);
  private store = inject(StoreFacade);
  private auth = inject(AuthSessionService);
  private storage = inject(LocalStorageService);
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // State Signals
  readonly isCheckoutOpen = signal<boolean>(false);
  readonly currentStep = signal<CheckoutStep>('shipping');
  readonly selectedPaymentMethod = signal<PaymentMethodType>('mercado-pago');
  readonly isProcessing = signal<boolean>(false);
  readonly processingMessage = signal<string>('Procesando...');
  readonly errorMessage = signal<string | null>(null);
  readonly lastCompletedOrder = signal<Order | null>(null);
  /** Datos para transferir (del comercio), cuando se eligió transferencia. */
  readonly bankTransferInfo = signal<BankTransferInfo | null>(null);
  /** El pago se hizo en Mercado Pago pero todavía no llegó la confirmación. */
  readonly isAwaitingPaymentConfirmation = signal<boolean>(false);

  // Form state
  readonly shipping = signal<ShippingData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    provinceState: 'Buenos Aires',
    postalCode: '',
    notes: '',
    ...this.storage.getItem<Partial<ShippingData>>(SHIPPING_KEY, {}),
  });

  readonly bankTransferPercent = computed(() => this.store.settings().bankTransferDiscountPercent);

  // Descuento por transferencia, sobre el total con envío (igual que el servidor)
  readonly bankTransferDiscount = computed(() => {
    if (this.selectedPaymentMethod() !== 'bank-transfer') return 0;
    return Math.round((this.cartFacade.summary().total * this.bankTransferPercent()) / 100);
  });

  readonly finalCheckoutAmount = computed(() => {
    return Math.max(0, this.cartFacade.summary().total - this.bankTransferDiscount());
  });

  constructor() {
    // Completa nombre y correo con los de la cuenta si la clienta inició sesión.
    effect(() => {
      const user = this.auth.user();
      if (!user || user.role !== 'CUSTOMER') return;
      this.shipping.update((s) => ({ ...s, fullName: s.fullName || user.name, email: s.email || user.email }));
    });
  }

  openCheckout(): void {
    if (this.cartFacade.items().length === 0) return;
    this.errorMessage.set(null);
    this.currentStep.set('shipping');
    this.isCheckoutOpen.set(true);
    this.cartFacade.closeCart();
  }

  closeCheckout(): void {
    if (!this.isProcessing()) {
      this.isCheckoutOpen.set(false);
    }
  }

  setPaymentMethod(method: PaymentMethodType): void {
    this.selectedPaymentMethod.set(method);
    this.errorMessage.set(null);
  }

  updateShipping(data: Partial<ShippingData>): void {
    this.shipping.update((prev) => ({ ...prev, ...data }));
  }

  proceedToPayment(): void {
    this.errorMessage.set(null);
    const validation = this.validator.validateShipping(this.shipping());

    if (!validation.valid) {
      this.errorMessage.set(validation.errors[0]);
      return;
    }

    this.currentStep.set('payment');
  }

  backToShipping(): void {
    this.errorMessage.set(null);
    this.currentStep.set('shipping');
  }

  submitOrder(): void {
    this.errorMessage.set(null);
    const method = this.selectedPaymentMethod();
    const shipping = this.shipping();
    const { notes: _notes, ...reusable } = shipping;
    this.storage.setItem(SHIPPING_KEY, reusable);

    this.isProcessing.set(true);
    this.processingMessage.set('Reservando tus prendas...');

    this.orders
      .create({
        customer: shipping,
        items: this.cartFacade.items(),
        couponCode: this.cartFacade.appliedCoupon()?.code ?? null,
        paymentMethod: method,
      })
      .subscribe({
        next: (res) => {
          if (res.checkoutUrl) {
            // Mercado Pago: guardamos el pedido para mostrarlo cuando la clienta vuelva.
            this.storage.setItem<PendingCheckout>(PENDING_KEY, {
              orderNumber: res.order.orderNumber,
              email: res.order.customer.email,
            });
            this.processingMessage.set('Te llevamos a Mercado Pago...');
            this.document.location.assign(res.checkoutUrl);
            return;
          }
          this.isProcessing.set(false);
          this.bankTransferInfo.set(res.bankTransfer);
          this.showConfirmation(res.order);
        },
        error: (err) => {
          this.isProcessing.set(false);
          this.errorMessage.set(apiErrorMessage(err, 'Hubo un inconveniente al procesar el pedido.'));
          // Si algo se quedó sin stock, refrescamos el catálogo y el carrito.
          if ((err as { status?: number }).status === 409) this.catalogFacade.reload();
        },
      });
  }

  /**
   * La clienta vuelve de Mercado Pago a `/?order=MLK-123456&payment=success|pending|failure`.
   * Buscamos el pedido y mostramos el resultado.
   */
  handlePaymentReturn(orderNumber: string, result: string | null): void {
    if (!this.isBrowser) return;
    const pending = this.storage.getItem<PendingCheckout | null>(PENDING_KEY, null);
    const email = pending?.orderNumber === orderNumber ? pending.email : this.auth.user()?.email;
    if (!email) return;

    if (result === 'failure') {
      this.errorMessage.set('El pago no se completó. Tus prendas siguen en el carrito para que lo intentes de nuevo.');
      this.isCheckoutOpen.set(true);
      this.currentStep.set('payment');
      return;
    }

    this.orders.track(orderNumber, email).subscribe({
      next: (order) => {
        this.storage.removeItem(PENDING_KEY);
        this.bankTransferInfo.set(null);
        this.isCheckoutOpen.set(true);
        this.showConfirmation(order);
        if (order.status === 'PENDING_PAYMENT') this.waitForPayment(orderNumber, email);
      },
      error: () => undefined,
    });
  }

  /** El aviso de Mercado Pago puede tardar unos segundos: consultamos un rato más. */
  private waitForPayment(orderNumber: string, email: string, attempt = 1): void {
    this.isAwaitingPaymentConfirmation.set(true);
    if (attempt > 10) {
      this.isAwaitingPaymentConfirmation.set(false);
      return;
    }
    setTimeout(() => {
      this.orders.track(orderNumber, email).subscribe({
        next: (order) => {
          this.lastCompletedOrder.set(order);
          if (order.status === 'PENDING_PAYMENT') this.waitForPayment(orderNumber, email, attempt + 1);
          else this.isAwaitingPaymentConfirmation.set(false);
        },
        error: () => this.isAwaitingPaymentConfirmation.set(false),
      });
    }, 3000);
  }

  private showConfirmation(order: Order): void {
    this.lastCompletedOrder.set(order);
    this.cartFacade.clearCart();
    this.currentStep.set('confirmation');
    this.launchConfetti();
  }

  private launchConfetti(): void {
    if (!this.isBrowser) return;
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#FAF8F5', '#1C1917', '#E8D5CE'],
      });
    } catch {
      // Ignored if canvas confetti isn't supported in current environment
    }
  }

  resetCheckout(): void {
    this.isCheckoutOpen.set(false);
    this.currentStep.set('shipping');
    this.lastCompletedOrder.set(null);
    this.bankTransferInfo.set(null);
    this.isAwaitingPaymentConfirmation.set(false);
    this.errorMessage.set(null);
  }
}
