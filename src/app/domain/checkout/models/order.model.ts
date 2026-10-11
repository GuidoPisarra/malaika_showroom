import { CartItem, CartSummary } from '../../cart/models/cart-item.model';

export type PaymentMethodType = 'credit-card' | 'mercado-pago' | 'bank-transfer';

export interface CreditCardData {
  cardNumber: string;
  cardHolder: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  installments: number;
  cardBrand: 'visa' | 'mastercard' | 'amex' | 'generic';
}

export interface ShippingData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  provinceState: string;
  postalCode: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: ShippingData;
  items: CartItem[];
  summary: CartSummary;
  paymentMethod: PaymentMethodType;
  cardLastFour?: string;
  cardBrand?: string;
  installments?: number;
  status: 'pending' | 'processing' | 'approved' | 'failed';
  trackingNumber: string;
  estimatedDelivery: string;
  securityHash: string;
}
