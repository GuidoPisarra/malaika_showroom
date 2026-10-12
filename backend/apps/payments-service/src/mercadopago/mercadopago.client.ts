import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PreferenceRequest {
  orderId: string;
  orderNumber: string;
  title: string;
  total: number;
  currency: string;
  payerEmail: string;
  payerName: string;
  backUrl: string;
  notificationUrl: string | null;
  expiresAt: string | null;
}

export interface MpPayment {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  amount: number;
  raw: unknown;
}

/** Adaptador fino sobre el SDK oficial de Mercado Pago (Checkout Pro). */
@Injectable()
export class MercadoPagoClient {
  async createPreference(accessToken: string, req: PreferenceRequest): Promise<{ id: string; checkoutUrl: string }> {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
    const isHttps = req.backUrl.startsWith('https://');
    const pref = await new Preference(client).create({
      body: {
        external_reference: req.orderId,
        items: [
          {
            id: req.orderNumber,
            title: req.title,
            quantity: 1,
            unit_price: req.total,
            currency_id: req.currency,
          },
        ],
        payer: { email: req.payerEmail, name: req.payerName },
        back_urls: {
          success: `${req.backUrl}&payment=success`,
          pending: `${req.backUrl}&payment=pending`,
          failure: `${req.backUrl}&payment=failure`,
        },
        // Mercado Pago solo acepta volver automáticamente a URLs https.
        ...(isHttps ? { auto_return: 'approved' } : {}),
        ...(req.notificationUrl ? { notification_url: req.notificationUrl } : {}),
        ...(req.expiresAt ? { expires: true, expiration_date_to: req.expiresAt } : {}),
        statement_descriptor: req.title.slice(0, 22),
      },
      requestOptions: { idempotencyKey: `pref-${req.orderId}` },
    });
    const checkoutUrl = accessToken.startsWith('TEST-') ? pref.sandbox_init_point : pref.init_point;
    if (!pref.id || !checkoutUrl) throw new Error('Mercado Pago no devolvió la URL de pago');
    return { id: pref.id, checkoutUrl };
  }

  async getPayment(accessToken: string, id: string): Promise<MpPayment> {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
    const p = await new Payment(client).get({ id });
    return {
      id: String(p.id),
      status: p.status ?? 'pending',
      statusDetail: p.status_detail ?? null,
      externalReference: p.external_reference ?? null,
      amount: Number(p.transaction_amount ?? 0),
      raw: p,
    };
  }

  /**
   * Valida la firma `x-signature` de un webhook.
   * https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
   */
  verifySignature(secret: string, signatureHeader: string | undefined, requestId: string | undefined, dataId: string): boolean {
    if (!signatureHeader) return false;
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((p) => p.trim().split('=', 2) as [string, string]),
    );
    if (!parts.ts || !parts.v1) return false;
    const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
    let manifest = `id:${id};`;
    if (requestId) manifest += `request-id:${requestId};`;
    manifest += `ts:${parts.ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
