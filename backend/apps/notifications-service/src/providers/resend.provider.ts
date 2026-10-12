import type { EmailProvider, OutgoingEmail } from './email-provider.js';

/** Resend (https://resend.com) por su API HTTP. */
export class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.resend.com',
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(email: OutgoingEmail): Promise<{ id: string | null }> {
    const res = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(email.idempotencyKey ? { 'Idempotency-Key': email.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.tags
          ? {
              // Resend solo acepta letras, números, guiones y guiones bajos en los tags.
              tags: Object.entries(email.tags).map(([name, value]) => ({
                name,
                value: value.replace(/[^A-Za-z0-9_-]/g, '_'),
              })),
            }
          : {}),
      }),
      // Menor que el timeout de RPC del gateway, para que el envío de prueba responda con el error real.
      signal: AbortSignal.timeout(8_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) {
      throw new Error(`Resend respondió ${res.status}: ${body.message ?? body.name ?? 'error desconocido'}`);
    }
    return { id: body.id ?? null };
  }
}
