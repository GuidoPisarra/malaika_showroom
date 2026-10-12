import { ProductColor } from '../../catalog/models/product.model';
import { BankTransferInfo } from '../../store/store-settings.model';

/** Medios de pago: Mercado Pago (Checkout Pro: tarjetas, débito, dinero en cuenta) o transferencia. */
export type PaymentMethodType = 'mercado-pago' | 'bank-transfer';

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

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  size: string;
  color: ProductColor;
}

export interface OrderTotals {
  itemsCount: number;
  subtotal: number;
  bundleDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  paymentDiscount: number;
  shipping: number;
  total: number;
}

/** Pedido tal como lo devuelve la API (orders-service). */
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: 'MERCADO_PAGO' | 'BANK_TRANSFER';
  paymentStatus: string;
  currency: string;
  customer: ShippingData;
  items: OrderItem[];
  totals: OrderTotals;
  trackingNumber: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
}

export interface CreateOrderResponse {
  order: Order;
  /** URL de Mercado Pago a la que hay que redirigir. */
  checkoutUrl: string | null;
  bankTransfer: BankTransferInfo | null;
}
