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

/** Reglas comerciales del comercio, configuradas desde el panel (GET /api/store). */
export interface StoreSettings {
  currency: string;
  orderPrefix: string;
  shippingFee: number;
  freeShippingThreshold: number;
  bundleDiscounts: BundleDiscountTier[];
  bankTransferDiscountPercent: number;
  bankTransfer: BankTransferInfo | null;
  storefrontUrl: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface StoreInfo {
  id: string;
  slug: string;
  name: string;
  settings: StoreSettings;
}

/** Valores mientras carga la configuración real (los mismos que tenía el front fijos). */
export const FALLBACK_STORE_SETTINGS: StoreSettings = {
  currency: 'ARS',
  orderPrefix: 'MLK',
  shippingFee: 15000,
  freeShippingThreshold: 150000,
  bundleDiscounts: [
    { minItems: 2, percent: 5 },
    { minItems: 3, percent: 15 },
  ],
  bankTransferDiscountPercent: 5,
  bankTransfer: null,
  storefrontUrl: '',
  contactEmail: null,
  contactPhone: null,
};
