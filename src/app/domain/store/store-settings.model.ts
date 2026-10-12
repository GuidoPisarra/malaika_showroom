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

/** Zona de envío: por código postal ("1425" o "1000-1499") o por provincia. */
export interface ShippingZone {
  id: string;
  name: string;
  postalCodes: string[];
  provinces: string[];
  fee: number;
  /** null usa el mínimo general del comercio; 0 nunca es gratis. */
  freeShippingThreshold: number | null;
  eta: string;
}

/** Costo de envío para una dirección (GET /api/shipping/quote). */
export interface ShippingQuote {
  available: boolean;
  zoneId: string | null;
  zoneName: string | null;
  fee: number;
  freeShippingThreshold: number;
  eta: string | null;
}

/** Reglas comerciales del comercio, configuradas desde el panel (GET /api/store). */
export interface StoreSettings {
  currency: string;
  orderPrefix: string;
  shippingFee: number;
  freeShippingThreshold: number;
  shippingZones: ShippingZone[];
  shipsOutsideZones: boolean;
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
  shippingZones: [],
  shipsOutsideZones: true,
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
