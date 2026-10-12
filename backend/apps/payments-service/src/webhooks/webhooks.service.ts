import { BROKER, EVENTS, PaymentStatus, PaymentStatusChangedEvent, publish, unauthorized } from '@malaika/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma } from '../generated/prisma/client.js';
import { MercadoPagoClient } from '../mercadopago/mercadopago.client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentSettingsService } from '../settings/payment-settings.service.js';

export interface MercadoPagoWebhookInput {
  tenantId: string;
  query: Record<string, string | undefined>;
  body: { type?: string; action?: string; data?: { id?: string | number } } | null;
  signature?: string;
  requestId?: string;
}

const KNOWN: PaymentStatus[] = ['pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process'];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PaymentSettingsService,
    private readonly mp: MercadoPagoClient,
    @Inject(BROKER) private readonly broker: ClientProxy,
  ) {}

  async handleMercadoPago(input: MercadoPagoWebhookInput): Promise<{ received: true }> {
    const type = input.body?.type ?? input.query.type ?? input.query.topic;
    const dataId = String(input.query['data.id'] ?? input.body?.data?.id ?? input.query.id ?? '');
    if (type !== 'payment' || !dataId) return { received: true };

    const credentials = await this.settings.credentials(input.tenantId);
    if (!credentials) {
      this.logger.warn(`Webhook de Mercado Pago para un comercio sin credenciales (${input.tenantId})`);
      return { received: true };
    }
    if (credentials.webhookSecret && !this.mp.verifySignature(credentials.webhookSecret, input.signature, input.requestId, dataId)) {
      throw unauthorized('Firma de webhook inválida');
    }

    // Nunca confiamos en el cuerpo del webhook: consultamos el pago a Mercado Pago.
    const payment = await this.mp.getPayment(credentials.accessToken, dataId);
    if (!payment.externalReference) return { received: true };

    const record = await this.prisma.payment.findFirst({
      where: { tenantId: input.tenantId, orderId: payment.externalReference },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      this.logger.warn(`Pago ${payment.id} con referencia desconocida ${payment.externalReference}`);
      return { received: true };
    }

    const status = (KNOWN.includes(payment.status as PaymentStatus) ? payment.status : 'pending') as PaymentStatus;
    if (status === 'approved' && payment.amount < record.amount) {
      this.logger.error(`Pago ${payment.id} aprobado por un monto menor al del pedido ${record.orderNumber}`);
      return { received: true };
    }

    const previous = await this.prisma.payment.findUnique({ where: { providerPaymentId: payment.id } });
    if (previous?.status === status) return { received: true };

    const data = {
      status,
      statusDetail: payment.statusDetail,
      providerPaymentId: payment.id,
      raw: payment.raw as Prisma.InputJsonValue,
    };
    if (previous) await this.prisma.payment.update({ where: { id: previous.id }, data });
    else if (!record.providerPaymentId) await this.prisma.payment.update({ where: { id: record.id }, data });
    else {
      // Otro intento de pago sobre la misma preferencia.
      await this.prisma.payment.create({
        data: { ...data, tenantId: record.tenantId, orderId: record.orderId, orderNumber: record.orderNumber, amount: record.amount, preferenceId: record.preferenceId },
      });
    }

    const event: PaymentStatusChangedEvent = {
      tenantId: input.tenantId,
      orderId: record.orderId,
      status,
      providerPaymentId: payment.id,
    };
    await publish(this.broker, EVENTS.paymentStatusChanged, event);
    return { received: true };
  }
}
