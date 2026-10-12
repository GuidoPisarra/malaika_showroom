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

/**
 * Zona de envío. Una dirección cae en la zona si su código postal está en alguno
 * de los rangos ("1000-1499" o "1425") o, si ninguna zona la toma por código
 * postal, si su provincia está en la lista.
 */
export interface ShippingZone {
  id: string;
  name: string;
  postalCodes: string[];
  provinces: string[];
  fee: number;
  /** Compra mínima para envío gratis en esta zona. null usa la del comercio; 0 nunca es gratis. */
  freeShippingThreshold: number | null;
  /** Texto libre que ve la clienta, por ejemplo "24 a 48 h hábiles". */
  eta: string;
}

/** Reglas comerciales configurables por cada comercio. Montos en la moneda del comercio. */
export interface StoreSettings {
  currency: string;
  orderPrefix: string;
  shippingFee: number;
  freeShippingThreshold: number;
  /** Zonas con costo propio. Sin zonas, todo el país paga shippingFee. */
  shippingZones: ShippingZone[];
  /** Si es false, solo se envía a direcciones que caen en alguna zona. */
  shipsOutsideZones: boolean;
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
  shippingZones: [],
  shipsOutsideZones: true,
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
