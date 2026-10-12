/**
 * Patrones de mensajes entre microservicios.
 *
 * Todos los mensajes viajan por un exchange "topic" de RabbitMQ y cada servicio
 * enlaza su cola con los patrones que maneja, así que el gateway publica sin
 * saber qué servicio responde.
 *
 * - Los `*.rpc` son request/response (send).
 * - Los `EVENTS` son eventos de dominio (emit) que pueden escuchar varios servicios.
 */
export const IDENTITY = {
  resolveTenant: 'identity.tenants.resolve',
  getTenant: 'identity.tenants.get',
  listTenants: 'identity.tenants.list',
  createTenant: 'identity.tenants.create',
  updateTenant: 'identity.tenants.update',
  updateStoreSettings: 'identity.tenants.settings.update',
  register: 'identity.auth.register',
  login: 'identity.auth.login',
  platformLogin: 'identity.auth.platform-login',
  refresh: 'identity.auth.refresh',
  logout: 'identity.auth.logout',
  me: 'identity.users.me',
  listUsers: 'identity.users.list',
  createAdmin: 'identity.users.create-admin',
} as const;

export const CATALOG = {
  listProducts: 'catalog.products.list',
  featuredProducts: 'catalog.products.featured',
  getProduct: 'catalog.products.get',
  productsByIds: 'catalog.products.by-ids',
  adminListProducts: 'catalog.products.admin-list',
  createProduct: 'catalog.products.create',
  updateProduct: 'catalog.products.update',
  deleteProduct: 'catalog.products.delete',
  setStock: 'catalog.products.set-stock',
  reserveStock: 'catalog.stock.reserve',
  listPresets: 'catalog.presets.list',
  upsertPreset: 'catalog.presets.upsert',
  deletePreset: 'catalog.presets.delete',
  listZones: 'catalog.zones.list',
  upsertZone: 'catalog.zones.upsert',
  deleteZone: 'catalog.zones.delete',
  listSavedLooks: 'catalog.looks.list',
  saveLook: 'catalog.looks.save',
  deleteSavedLook: 'catalog.looks.delete',
} as const;

export const ORDERS = {
  validateCoupon: 'orders.coupons.validate',
  listCoupons: 'orders.coupons.list',
  upsertCoupon: 'orders.coupons.upsert',
  deleteCoupon: 'orders.coupons.delete',
  createOrder: 'orders.orders.create',
  trackOrder: 'orders.orders.track',
  listMyOrders: 'orders.orders.mine',
  adminListOrders: 'orders.orders.admin-list',
  adminGetOrder: 'orders.orders.admin-get',
  updateStatus: 'orders.orders.update-status',
  dashboard: 'orders.dashboard',
} as const;

export const PAYMENTS = {
  createCheckout: 'payments.checkout.create',
  mercadoPagoWebhook: 'payments.webhooks.mercadopago',
  getSettings: 'payments.settings.get',
  updateSettings: 'payments.settings.update',
} as const;

export const NOTIFICATIONS = {
  listEmails: 'notifications.emails.list',
  sendTest: 'notifications.emails.test',
  preview: 'notifications.emails.preview',
} as const;

export const EVENTS = {
  /** Se creó un pedido y se reservó su stock. Payload: OrderEvent */
  orderCreated: 'events.order.created',
  /** El comercio cambió el estado de un pedido (en preparación, enviado, entregado). Payload: OrderStatusChangedEvent */
  orderStatusChanged: 'events.order.status-changed',
  /** Una clienta se creó una cuenta. Payload: UserRegisteredEvent */
  userRegistered: 'events.user.registered',
  /** Un pedido quedó pagado. Payload: OrderEvent */
  orderPaid: 'events.order.paid',
  /** Un pedido se canceló o venció sin pago: hay que liberar stock. Payload: OrderEvent */
  orderCancelled: 'events.order.cancelled',
  /** Mercado Pago informó un cambio en un pago. Payload: PaymentStatusChangedEvent */
  paymentStatusChanged: 'events.payment.status-changed',
  /** Cambió la configuración de un comercio: invalidar cachés. Payload: { tenantId } */
  tenantUpdated: 'events.tenant.updated',
} as const;

export interface OrderEvent {
  tenantId: string;
  orderId: string;
  orderNumber: string;
}

/** Por qué se canceló un pedido: define qué email recibe la clienta. */
export type CancelReason = 'expired' | 'merchant' | 'payment-init-failed';

export interface OrderCancelledEvent extends OrderEvent {
  reason?: CancelReason;
}

export interface OrderStatusChangedEvent extends OrderEvent {
  status: 'PREPARING' | 'SHIPPED' | 'DELIVERED';
}

export interface UserRegisteredEvent {
  tenantId: string;
  userId: string;
  email: string;
  name: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'in_process';

export interface PaymentStatusChangedEvent {
  tenantId: string;
  orderId: string;
  status: PaymentStatus;
  providerPaymentId: string;
}
