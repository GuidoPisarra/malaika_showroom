import { Injectable, computed, inject, signal } from '@angular/core';
import confetti from 'canvas-confetti';
import { PaymentGatewayService } from '../infrastructure/payment/payment-gateway.service';
import { PaymentValidatorDomainService } from '../domain/checkout/services/payment-validator.domain-service';
import { CreditCardData, Order, PaymentMethodType, ShippingData } from '../domain/checkout/models/order.model';
import { CartFacade } from './cart.facade';
import { LocalStorageService } from '../infrastructure/persistence/local-storage.service';

export type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

@Injectable({
  providedIn: 'root',
})
export class CheckoutFacade {
  private gateway = inject(PaymentGatewayService);
  private validator = inject(PaymentValidatorDomainService);
  private cartFacade = inject(CartFacade);
  private storage = inject(LocalStorageService);

  // State Signals
  readonly isCheckoutOpen = signal<boolean>(false);
  readonly currentStep = signal<CheckoutStep>('shipping');
  readonly selectedPaymentMethod = signal<PaymentMethodType>('credit-card');
  readonly isProcessing = signal<boolean>(false);
  readonly processingMessage = signal<string>('Verificando token de seguridad...');
  readonly errorMessage = signal<string | null>(null);
  readonly lastCompletedOrder = signal<Order | null>(null);

  // Form states
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
  });

  readonly card = signal<CreditCardData>({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '12',
    expiryYear: '28',
    cvv: '',
    installments: 3,
    cardBrand: 'visa',
  });

  readonly isCardFlipped = signal<boolean>(false);

  // Bank transfer discount computed (5% extra discount if paying via direct transfer)
  readonly bankTransferDiscount = computed(() => {
    if (this.selectedPaymentMethod() === 'bank-transfer') {
      return Math.round(this.cartFacade.summary().total * 0.05 * 100) / 100;
    }
    return 0;
  });

  readonly finalCheckoutAmount = computed(() => {
    return Math.max(0, this.cartFacade.summary().total - this.bankTransferDiscount());
  });

  // Recent order history
  readonly orderHistory = signal<Order[]>([]);

  constructor() {
    this.loadOrders();
  }

  private loadOrders(): void {
    const orders = this.storage.getItem<Order[]>('mlk_orders_history', []);
    this.orderHistory.set(orders);
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

  updateCard(data: Partial<CreditCardData>): void {
    this.card.update((prev) => {
      const next = { ...prev, ...data };
      if (data.cardNumber !== undefined) {
        next.cardBrand = this.validator.detectCardBrand(next.cardNumber);
      }
      return next;
    });
  }

  setCardFlipped(flipped: boolean): void {
    this.isCardFlipped.set(flipped);
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

    // If credit card, validate card data
    if (this.selectedPaymentMethod() === 'credit-card') {
      const cardValidation = this.validator.validateCard(this.card());
      if (!cardValidation.valid) {
        this.errorMessage.set(cardValidation.errors[0]);
        return;
      }
    }

    this.isProcessing.set(true);
    this.processingMessage.set('Conectando con la pasarela bancaria segura (SSL 256-bit)...');

    setTimeout(() => {
      this.processingMessage.set('Validando protocolo 3D Secure y tokenización...');
    }, 800);

    const items = [...this.cartFacade.items()];
    const summary = { ...this.cartFacade.summary(), total: this.finalCheckoutAmount() };

    this.gateway
      .processPayment(
        this.selectedPaymentMethod(),
        this.selectedPaymentMethod() === 'credit-card' ? this.card() : null,
        this.shipping(),
        items,
        summary
      )
      .subscribe({
        next: (res) => {
          this.isProcessing.set(false);
          if (res.success && res.order) {
            this.lastCompletedOrder.set(res.order);
            const history = [res.order, ...this.orderHistory()];
            this.orderHistory.set(history);
            this.storage.setItem('mlk_orders_history', history);

            // Empty cart
            this.cartFacade.clearCart();
            this.currentStep.set('confirmation');

            // Trigger celebration confetti
            this.launchConfetti();
          } else {
            this.errorMessage.set(res.errorMessage || 'Hubo un inconveniente al procesar el pago.');
          }
        },
        error: () => {
          this.isProcessing.set(false);
          this.errorMessage.set('Error en la pasarela de pagos. Por favor intenta nuevamente.');
        },
      });
  }

  private launchConfetti(): void {
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
    this.errorMessage.set(null);
  }
}
