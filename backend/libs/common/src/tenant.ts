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

/** Cómo se ven y a quién se mandan los emails del comercio. */
export interface EmailSettings {
  /** Apaga todos los emails a clientas (los avisos al comercio siguen). */
  enabled: boolean;
  /** Nombre del remitente. null usa el nombre del comercio. */
  senderName: string | null;
  /**
   * Dirección del remitente. Tiene que ser de un dominio verificado en el
   * proveedor de emails; null usa la de la plataforma (EMAIL_FROM).
   */
  fromAddress: string | null;
  /** A dónde responden las clientas. null usa contactEmail. */
  replyTo: string | null;
  logoUrl: string | null;
  /** Color de botones y detalles. */
  accentColor: string;
  /** Quiénes reciben el aviso de cada pedido nuevo. Vacío usa contactEmail. */
  adminRecipients: string[];
  notifyAdminOnOrder: boolean;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: true,
  senderName: null,
  fromAddress: null,
  replyTo: null,
  logoUrl: null,
  accentColor: '#1C1917',
  adminRecipients: [],
  notifyAdminOnOrder: true,
};

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
  emails: EmailSettings;
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
  emails: DEFAULT_EMAIL_SETTINGS,
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
