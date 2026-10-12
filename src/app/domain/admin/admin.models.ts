/** Modelos del panel del comercio (respuestas de /api/admin/*). Montos enteros en pesos. */

import type { VariantStock } from '../catalog/models/product.model';
import type { ShippingZone } from '../store/store-settings.model';

export type { VariantStock } from '../catalog/models/product.model';
export type { ShippingZone } from '../store/store-settings.model';

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// ---------- Pedidos ----------

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const ORDER_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAID: 'Pagado',
  PREPARING: 'En preparación',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/** Cambios de estado que acepta la API. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PREPARING', 'SHIPPED', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export type PaymentMethod = 'MERCADO_PAGO' | 'BANK_TRANSFER' | string;

export const PAYMENT_METHOD_LABELS: Partial<Record<string, string>> = {
  MERCADO_PAGO: 'Mercado Pago',
  BANK_TRANSFER: 'Transferencia bancaria',
};

export interface OrderCustomer {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  apartment?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  size: string | null;
  color: { name: string | null; hex: string | null };
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

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  currency: string;
  customer: OrderCustomer;
  items: OrderItem[];
  totals: OrderTotals;
  trackingNumber: string | null;
  adminNotes: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
}

export interface OrderListParams extends PageParams {
  status?: OrderStatus | '';
}

export interface OrderStatusChange {
  status: OrderStatus;
  trackingNumber?: string;
  adminNotes?: string;
}

export interface SalesSummary {
  orders: number;
  revenue: number;
}

export interface Dashboard {
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  last24Hours: SalesSummary;
  last30Days: SalesSummary;
}

// ---------- Productos ----------

export type ProductSlot = 'top' | 'bottom' | 'shoes' | 'accessory' | 'dress';
export type ArModelType = 'hanger' | 'mannequin' | 'display-stand';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface AdminProduct {
  id: string;
  sku: string | null;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  slot: ProductSlot | null;
  image: string;
  gallery: string[];
  colors: ProductColor[];
  sizes: string[];
  material: string;
  occasion: string;
  isNew: boolean;
  isTrending: boolean;
  rating: number;
  reviewsCount: number;
  details: string[];
  stock: number;
  inStock: boolean;
  /** true: el stock se controla por talle y color y `stock` es la suma. */
  variantStock: boolean;
  variants: VariantStock[];
  silhouette?: Record<string, unknown>;
  arModelType?: ArModelType;
  arScale?: number;
  active: boolean;
  createdAt: string;
}

/** Cuerpo de POST/PATCH /admin/products. */
export interface ProductInput {
  sku?: string | null;
  name: string;
  subtitle?: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  category: string;
  slot?: ProductSlot;
  image: string;
  gallery?: string[];
  colors?: ProductColor[];
  sizes?: string[];
  material?: string;
  occasion?: string;
  isNew?: boolean;
  isTrending?: boolean;
  details?: string[];
  stock?: number;
  arModelType?: ArModelType | null;
  arScale?: number | null;
  active?: boolean;
}

/** Cuerpo de PUT /admin/products/:id/stock: stock general o por talle y color, uno de los dos. */
export type StockUpdate = { stock: number } | { variants: VariantStock[] };

// ---------- Imágenes ----------

/** Carpeta donde se guarda una imagen subida; define el tamaño máximo. */
export type UploadFolder = 'products' | 'looks' | 'showroom' | 'brand';

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  size: number;
}

// ---------- Cupones ----------

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  percent: number | null;
  fixedAmount: number | null;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface CouponInput {
  code: string;
  description?: string;
  percent: number | null;
  fixedAmount: number | null;
  minSubtotal: number | null;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

// ---------- Looks y showroom ----------

export interface LookPreset {
  id: string;
  name: string;
  subtitle: string | null;
  tag: string | null;
  imagePreview: string;
  itemIds: string[];
  position: number;
}

export interface LookPresetInput {
  name: string;
  subtitle?: string;
  tag?: string;
  imagePreview: string;
  itemIds: string[];
  position?: number;
}

export interface ShowroomHotspot {
  id: string;
  productId: string;
  label: string;
}

export interface ShowroomZone {
  id: string;
  name: string;
  ambianceTitle: string | null;
  description: string | null;
  accentColor: string | null;
  panoramicImage: string;
  position: number;
  hotspots: ShowroomHotspot[];
}

// ---------- Configuración ----------

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

export interface TenantAdminView {
  id: string;
  slug: string;
  name: string;
  settings: StoreSettings;
  domains: string[];
  active: boolean;
}

export interface PublicStore {
  id: string;
  slug: string;
  name: string;
}

export interface PaymentSettings {
  mercadoPagoConfigured: boolean;
  mpAccessToken: string | null;
  mpPublicKey: string | null;
  mpWebhookSecret: string | null;
  updatedAt: string | null;
  /** URL real del webhook de este comercio, armada con PUBLIC_API_URL del servidor. */
  webhookUrl: string | null;
}

export interface PaymentSettingsInput {
  mpAccessToken?: string | null;
  mpPublicKey?: string | null;
  mpWebhookSecret?: string | null;
}

// ---------- Usuarios ----------

export type AdminUserRole = 'CUSTOMER' | 'ADMIN' | 'SUPERADMIN';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: AdminUserRole;
  tenantId: string | null;
}

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}
