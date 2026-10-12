/** Escalón de descuento por cantidad de prendas ("arma tu look"). */
export interface BundleDiscountTier {
  minItems: number;
  percent: number;
}

export interface BankTransferInfo {
  holder: string;
  cbu: string;
  alias: string;
  bank: string;
  cuit?: string;
}

/** Reglas comerciales configurables por cada comercio. Montos en la moneda del comercio. */
export interface StoreSettings {
  currency: string;
  orderPrefix: string;
  shippingFee: number;
  freeShippingThreshold: number;
  bundleDiscounts: BundleDiscountTier[];
  bankTransferDiscountPercent: number;
  bankTransfer: BankTransferInfo | null;
  /** URL pública de la tienda, para volver desde Mercado Pago. */
  storefrontUrl: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: 'ARS',
  orderPrefix: 'ORD',
  shippingFee: 15000,
  freeShippingThreshold: 150000,
  bundleDiscounts: [],
  bankTransferDiscountPercent: 0,
  bankTransfer: null,
  storefrontUrl: 'http://localhost:4200',
  contactEmail: null,
  contactPhone: null,
};

/** Comercio resuelto por el gateway y adjunto a cada mensaje. */
export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  settings: StoreSettings;
}

/** Payload base de todo mensaje que opera sobre datos de un comercio. */
export interface TenantScoped {
  tenantId: string;
}
