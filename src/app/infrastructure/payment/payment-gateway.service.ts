import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { CreditCardData, Order, PaymentMethodType, ShippingData } from '../../domain/checkout/models/order.model';
import { CartItem, CartSummary } from '../../domain/cart/models/cart-item.model';

export interface PaymentProcessResult {
  success: boolean;
  order?: Order;
  errorMessage?: string;
  transactionToken?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentGatewayService {
  processPayment(
    paymentMethod: PaymentMethodType,
    cardData: CreditCardData | null,
    shippingData: ShippingData,
    items: CartItem[],
    summary: CartSummary
  ): Observable<PaymentProcessResult> {
    const orderNumber = 'MLK-' + Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = 'MLK-TRK-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const securityHash = 'SEC-' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    // Estimate delivery 3-5 business days from now
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const formattedDelivery = deliveryDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const sanitizedCardNumber = cardData?.cardNumber.replace(/\s+/g, '') || '';
    const lastFour = sanitizedCardNumber.slice(-4) || '8842';

    const order: Order = {
      id: 'ord-' + Date.now(),
      orderNumber,
      createdAt: new Date().toISOString(),
      customer: shippingData,
      items,
      summary,
      paymentMethod,
      cardLastFour: paymentMethod === 'credit-card' ? lastFour : undefined,
      cardBrand: cardData?.cardBrand,
      installments: cardData?.installments || 1,
      status: 'approved',
      trackingNumber,
      estimatedDelivery: formattedDelivery,
      securityHash,
    };

    // Simulate 1.5s secure handshake with bank & fraud analysis
    return of({
      success: true,
      order,
      transactionToken: 'tok_' + Math.random().toString(36).substring(2, 12),
    }).pipe(delay(1600));
  }
}
