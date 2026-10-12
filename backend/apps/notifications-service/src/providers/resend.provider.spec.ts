import { describe, expect, it, vi } from 'vitest';
import { ResendProvider } from './resend.provider.js';

const email = {
  from: '"Malaika" <ventas@malaika.com.ar>',
  to: ['lucia@ejemplo.com'],
  replyTo: 'hola@malaika.com.ar',
  subject: 'Hola',
  html: '<p>Hola</p>',
  text: 'Hola',
  idempotencyKey: 't1:order-paid:o1',
  tags: { type: 'order-paid', tenant: 'cm1.abc' },
};

describe('ResendProvider', () => {
  it('manda el mail con la clave, el reply_to y la clave de idempotencia', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    const provider = new ResendProvider('re_123', 'https://api.resend.test/', fetchFn as unknown as typeof fetch);

    await expect(provider.send(email)).resolves.toEqual({ id: 'em_1' });

    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.test/emails');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_123');
    expect(headers['Idempotency-Key']).toBe('t1:order-paid:o1');
    const body = JSON.parse(init.body as string);
    expect(body.reply_to).toBe('hola@malaika.com.ar');
    expect(body.tags).toEqual([
      { name: 'type', value: 'order-paid' },
      { name: 'tenant', value: 'cm1_abc' },
    ]);
  });

  it('convierte una respuesta con error en una excepción con el mensaje de Resend', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ name: 'validation_error', message: 'The domain is not verified' }), { status: 403 }));
    const provider = new ResendProvider('re_123', 'https://api.resend.test', fetchFn as unknown as typeof fetch);
    await expect(provider.send(email)).rejects.toThrow('Resend respondió 403: The domain is not verified');
  });
});
