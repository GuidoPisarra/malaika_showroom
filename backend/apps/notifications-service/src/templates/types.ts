import type { BankTransferInfo, StoreSettings } from '@malaika/common';

/** Pedido tal como lo devuelve orders-service (toOrderView). */
export interface OrderView {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: 'MERCADO_PAGO' | 'BANK_TRANSFER';
  currency: string;
  customer: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    apartment?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    zone?: string | null;
    eta?: string | null;
  };
  items: Array<{
    name: string;
    image: string;
    unitPrice: number;
    quantity: number;
    size: string;
    color: { name: string; hex: string };
  }>;
  totals: {
    itemsCount: number;
    subtotal: number;
    bundleDiscount: number;
    couponCode: string | null;
    couponDiscount: number;
    paymentDiscount: number;
    shipping: number;
    total: number;
  };
  trackingNumber: string | null;
  createdAt: string;
  expiresAt: string | null;
}

/** Comercio tal como lo devuelve identity-service. */
export interface TenantView {
  id: string;
  slug: string;
  name: string;
  /** Dominios de la tienda; los carga el superadmin. */
  domains?: string[];
  settings: StoreSettings;
}

/** Datos de marca con los que se arma cada email. */
export interface Brand {
  name: string;
  logoUrl: string | null;
  accent: string;
  storefrontUrl: string;
  contactEmail: string | null;
  contactPhone: string | null;
  currency: string;
  bankTransfer: BankTransferInfo | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}
