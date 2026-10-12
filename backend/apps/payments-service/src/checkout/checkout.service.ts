import { BROKER, EVENTS, TenantContext, badRequest, publish, rpcError } from '@malaika/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MercadoPagoClient } from '../mercadopago/mercadopago.client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentSettingsService } from '../settings/payment-settings.service.js';

export interface CheckoutOrder {
  id: string;
  orderNumber: string;
  total: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  expiresAt?: string;
  itemsCount: number;
}

const SIMULATION = process.env.PAYMENTS_SIMULATION === 'true';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PaymentSettingsService,
    private readonly mp: MercadoPagoClient,
    @Inject(BROKER) private readonly broker: ClientProxy,
  ) {}

  /** Crea la preferencia de Checkout Pro y devuelve la URL a la que se redirige a la clienta. */
  async create(input: { tenant: TenantContext; order: CheckoutOrder }): Promise<{ checkoutUrl: string }> {
    const { tenant, order } = input;
    if (order.total <= 0) throw badRequest('El total del pedido debe ser mayor a cero');
    const backUrl = `${tenant.settings.storefrontUrl.replace(/\/$/, '')}/?order=${encodeURIComponent(order.orderNumber)}`;

    if (SIMULATION) return this.simulate(tenant, order, backUrl);

    const credentials = await this.settings.credentials(tenant.id);
    if (!credentials) {
      throw rpcError(503, 'Este comercio todavía no configuró Mercado Pago', 'PAYMENTS_NOT_CONFIGURED');
    }

    const publicApi = process.env.PUBLIC_API_URL ?? '';
    try {
      const pref = await this.mp.createPreference(credentials.accessToken, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        title: `${tenant.name} - Pedido ${order.orderNumber}`,
        total: order.total,
        currency: order.currency,
        payerEmail: order.customerEmail,
        payerName: order.customerName,
        backUrl,
        // Mercado Pago solo notifica a URLs públicas https.
        notificationUrl: publicApi.startsWith('https://')
          ? `${publicApi.replace(/\/$/, '')}/api/webhooks/mercadopago/${tenant.slug}`
          : null,
        expiresAt: order.expiresAt ?? null,
      });
      await this.prisma.payment.create({
        data: {
          tenantId: tenant.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: order.total,
          currency: order.currency,
          preferenceId: pref.id,
          checkoutUrl: pref.checkoutUrl,
        },
      });
      return { checkoutUrl: pref.checkoutUrl };
    } catch (err) {
      this.logger.error(`Mercado Pago rechazó la preferencia del pedido ${order.orderNumber}: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
      throw rpcError(502, 'No pudimos conectar con Mercado Pago, intentá de nuevo en unos minutos', 'PAYMENT_PROVIDER_ERROR');
    }
  }

  /** Modo desarrollo: aprueba el pago al instante sin llamar a Mercado Pago. */
  private async simulate(tenant: TenantContext, order: CheckoutOrder, backUrl: string) {
    const providerPaymentId = `sim-${order.id}`;
    await this.prisma.payment.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.total,
        currency: order.currency,
        provider: 'simulation',
        status: 'approved',
        providerPaymentId,
        checkoutUrl: backUrl,
      },
    });
    this.logger.warn(`PAYMENTS_SIMULATION activo: pedido ${order.orderNumber} aprobado sin cobrar`);
    // Se publica después de responder, como haría el webhook real.
    setTimeout(() => {
      void publish(this.broker, EVENTS.paymentStatusChanged, {
        tenantId: tenant.id,
        orderId: order.id,
        status: 'approved',
        providerPaymentId,
      });
    }, 500);
    return { checkoutUrl: `${backUrl}&payment=success` };
  }
}
