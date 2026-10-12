import { badRequest, decryptSecret, encryptSecret, maskSecret } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PaymentSettingsInput {
  /** undefined: no cambia. null o "": lo borra. */
  mpAccessToken?: string | null;
  mpPublicKey?: string | null;
  mpWebhookSecret?: string | null;
}

export interface MercadoPagoCredentials {
  accessToken: string;
  webhookSecret: string | null;
}

const secretUpdate = (value: string | null | undefined) =>
  value === undefined ? undefined : value ? encryptSecret(value.trim()) : null;

@Injectable()
export class PaymentSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vista para el panel: los secretos nunca salen enteros. */
  async get(tenantId: string) {
    const s = await this.prisma.paymentSettings.findUnique({ where: { tenantId } });
    return {
      mercadoPagoConfigured: Boolean(s?.mpAccessTokenEnc),
      mpAccessToken: s?.mpAccessTokenEnc ? maskSecret(decryptSecret(s.mpAccessTokenEnc)) : null,
      mpPublicKey: s?.mpPublicKey ?? null,
      mpWebhookSecret: s?.mpWebhookSecretEnc ? maskSecret(decryptSecret(s.mpWebhookSecretEnc)) : null,
      updatedAt: s?.updatedAt ?? null,
    };
  }

  async update(tenantId: string, input: PaymentSettingsInput) {
    if (input.mpAccessToken && !/^(APP_USR|TEST)-/.test(input.mpAccessToken.trim())) {
      throw badRequest('El access token de Mercado Pago debe empezar con APP_USR- o TEST-');
    }
    const data = {
      mpAccessTokenEnc: secretUpdate(input.mpAccessToken),
      mpWebhookSecretEnc: secretUpdate(input.mpWebhookSecret),
      mpPublicKey: input.mpPublicKey === undefined ? undefined : input.mpPublicKey?.trim() || null,
    };
    await this.prisma.paymentSettings.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
    return this.get(tenantId);
  }

  async credentials(tenantId: string): Promise<MercadoPagoCredentials | null> {
    const s = await this.prisma.paymentSettings.findUnique({ where: { tenantId } });
    if (!s?.mpAccessTokenEnc) return null;
    return {
      accessToken: decryptSecret(s.mpAccessTokenEnc),
      webhookSecret: s.mpWebhookSecretEnc ? decryptSecret(s.mpWebhookSecretEnc) : null,
    };
  }
}
