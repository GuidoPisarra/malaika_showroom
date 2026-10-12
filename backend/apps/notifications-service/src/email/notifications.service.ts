import { BROKER, IDENTITY, ORDERS, badRequest, rpc } from '@malaika/common';
import type { OrderCancelledEvent, OrderEvent, OrderStatusChangedEvent, UserRegisteredEvent } from '@malaika/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { adminRecipients, brandOf, fromHeader } from '../templates/brand.js';
import * as templates from '../templates/emails.js';
import type { EmailType } from '../templates/emails.js';
import { sampleOrder } from '../templates/sample.js';
import type { OrderView, RenderedEmail, TenantView } from '../templates/types.js';
import { EmailLogService } from './email-log.service.js';

const platformFrom = () => process.env.EMAIL_FROM || 'Tienda <no-reply@localhost>';

/** Decide qué email corresponde a cada evento y lo manda con la marca del comercio. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly emails: EmailLogService,
    @Inject(BROKER) private readonly broker: ClientProxy,
  ) {}

  async onOrderCreated(event: OrderEvent) {
    const { tenant, order } = await this.load(event);
    if (order.paymentMethod !== 'BANK_TRANSFER') return; // Mercado Pago: se avisa cuando se acredita.
    await this.toCustomer(tenant, order, 'order-received-transfer', templates.orderReceivedTransfer(brandOf(tenant), order));
    await this.toAdmins(tenant, order, `admin-new-order:${order.id}:created`);
  }

  async onOrderPaid(event: OrderEvent) {
    const { tenant, order } = await this.load(event);
    await this.toCustomer(tenant, order, 'order-paid', templates.orderPaid(brandOf(tenant), order));
    await this.toAdmins(tenant, order, `admin-new-order:${order.id}:paid`);
  }

  async onOrderStatusChanged(event: OrderStatusChangedEvent) {
    if (event.status === 'PREPARING') return;
    const { tenant, order } = await this.load(event);
    const brand = brandOf(tenant);
    if (event.status === 'SHIPPED') await this.toCustomer(tenant, order, 'order-shipped', templates.orderShipped(brand, order));
    if (event.status === 'DELIVERED') await this.toCustomer(tenant, order, 'order-delivered', templates.orderDelivered(brand, order));
  }

  async onOrderCancelled(event: OrderCancelledEvent) {
    // Si no se pudo abrir Mercado Pago, la clienta ya vio el error en la tienda.
    if (event.reason === 'payment-init-failed') return;
    const { tenant, order } = await this.load(event);
    const expired = event.reason === 'expired';
    await this.toCustomer(
      tenant,
      order,
      expired ? 'order-expired' : 'order-cancelled',
      templates.orderCancelled(brandOf(tenant), order, expired),
      `order-cancelled:${order.id}`,
    );
  }

  async onUserRegistered(event: UserRegisteredEvent) {
    const tenant = await this.tenant(event.tenantId);
    const rendered = templates.welcome(brandOf(tenant), event.name);
    await this.emails.send({
      tenantId: tenant.id,
      type: 'welcome',
      dedupeKey: `welcome:${event.userId}`,
      to: [event.email],
      from: fromHeader(tenant, platformFrom()),
      replyTo: this.replyTo(tenant),
      skip: !tenant.settings.emails.enabled,
      ...rendered,
    });
  }

  /** Manda un email de prueba y espera el resultado, para mostrarlo en el panel. */
  async sendTest(input: { tenantId: string; to: string }) {
    const tenant = await this.tenant(input.tenantId);
    const log = await this.emails.send({
      tenantId: tenant.id,
      type: 'test',
      dedupeKey: `test:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      to: [input.to],
      from: fromHeader(tenant, platformFrom()),
      replyTo: this.replyTo(tenant),
      ...templates.testEmail(brandOf(tenant)),
    });
    return { status: log?.status ?? 'FAILED', error: log?.error ?? null, from: fromHeader(tenant, platformFrom()) };
  }

  /** Vista previa de un tipo de email con un pedido de ejemplo y la marca real del comercio. */
  async preview(input: { tenantId: string; type: EmailType }): Promise<RenderedEmail & { from: string }> {
    const tenant = await this.tenant(input.tenantId);
    const brand = brandOf(tenant);
    const transfer = sampleOrder(tenant.settings.currency, 'BANK_TRANSFER');
    const paid = sampleOrder(tenant.settings.currency);
    const renderers: Record<EmailType, () => RenderedEmail> = {
      'order-received-transfer': () => templates.orderReceivedTransfer(brand, transfer),
      'order-paid': () => templates.orderPaid(brand, paid),
      'order-shipped': () => templates.orderShipped(brand, paid),
      'order-delivered': () => templates.orderDelivered(brand, paid),
      'order-cancelled': () => templates.orderCancelled(brand, paid, false),
      'order-expired': () => templates.orderCancelled(brand, transfer, true),
      'admin-new-order': () => templates.adminNewOrder(brand, paid, this.adminUrl(tenant)),
      welcome: () => templates.welcome(brand, paid.customer.fullName),
      test: () => templates.testEmail(brand),
    };
    const render = Object.hasOwn(renderers, input.type) ? renderers[input.type] : undefined;
    if (!render) throw badRequest('Tipo de email desconocido');
    return { ...render(), from: fromHeader(tenant, platformFrom()) };
  }

  private async toCustomer(tenant: TenantView, order: OrderView, type: EmailType, rendered: RenderedEmail, dedupeKey?: string) {
    await this.emails.send({
      tenantId: tenant.id,
      type,
      dedupeKey: dedupeKey ?? `${type}:${order.id}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      to: [order.customer.email],
      from: fromHeader(tenant, platformFrom()),
      replyTo: this.replyTo(tenant),
      skip: !tenant.settings.emails.enabled,
      ...rendered,
    });
  }

  private async toAdmins(tenant: TenantView, order: OrderView, dedupeKey: string) {
    const to = adminRecipients(tenant);
    if (!tenant.settings.emails.notifyAdminOnOrder || !to.length) return;
    await this.emails.send({
      tenantId: tenant.id,
      type: 'admin-new-order',
      dedupeKey,
      orderId: order.id,
      orderNumber: order.orderNumber,
      to,
      from: fromHeader(tenant, platformFrom()),
      // Así el comercio le responde directo a la clienta.
      replyTo: order.customer.email,
      ...templates.adminNewOrder(brandOf(tenant), order, this.adminUrl(tenant)),
    });
  }

  private replyTo(tenant: TenantView): string | null {
    return tenant.settings.emails.replyTo || tenant.settings.contactEmail || null;
  }

  private adminUrl(tenant: TenantView): string | null {
    const base = tenant.settings.storefrontUrl;
    return base ? `${base.replace(/\/+$/, '')}/admin/orders` : null;
  }

  private tenant(tenantId: string): Promise<TenantView> {
    return rpc<TenantView>(this.broker, IDENTITY.getTenant, { tenantId });
  }

  private async load(event: OrderEvent): Promise<{ tenant: TenantView; order: OrderView }> {
    const [tenant, order] = await Promise.all([
      this.tenant(event.tenantId),
      rpc<OrderView>(this.broker, ORDERS.adminGetOrder, { tenantId: event.tenantId, id: event.orderId }),
    ]);
    return { tenant, order };
  }
}
