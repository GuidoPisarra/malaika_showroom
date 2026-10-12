import { createHmac } from 'node:crypto';
import { MercadoPagoClient } from './mercadopago.client.js';

describe('MercadoPagoClient.verifySignature', () => {
  const client = new MercadoPagoClient();
  const secret = 'clave-secreta';
  const sign = (manifest: string) => createHmac('sha256', secret).update(manifest).digest('hex');

  it('acepta una firma válida', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(client.verifySignature(secret, `ts=1700000000,v1=${v1}`, 'req-1', '123456')).toBe(true);
  });

  it('rechaza una firma alterada o ausente', () => {
    const v1 = sign('id:123456;request-id:req-1;ts:1700000000;');
    expect(client.verifySignature(secret, `ts=1700000000,v1=${v1}`, 'req-1', '999999')).toBe(false);
    expect(client.verifySignature(secret, undefined, 'req-1', '123456')).toBe(false);
  });
});
