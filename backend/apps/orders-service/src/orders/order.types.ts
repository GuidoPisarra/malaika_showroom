import type { PaymentMethod, TenantContext } from '@malaika/common';

/** Datos de envío que completa la clienta (ShippingData del front). */
export interface ShippingInput {
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

export interface OrderLineInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

export interface CreateOrderInput {
  tenant: TenantContext;
  userId?: string | null;
  customer: ShippingInput;
  items: OrderLineInput[];
  couponCode?: string | null;
  paymentMethod: PaymentMethod;
}

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/** Producto tal como lo devuelve catalog-service. */
export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  stock: number;
  active: boolean;
}
