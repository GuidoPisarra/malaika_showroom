import { DEFAULT_STORE_SETTINGS } from '@malaika/common';
import { describe, expect, it } from 'vitest';
import { adminRecipients, brandOf, fromHeader, ownFromAddress, parseAddress } from './brand.js';
import * as emails from './emails.js';
import { esc, safeColor, safeUrl } from './layout.js';
import { sampleOrder } from './sample.js';
import type { TenantView } from './types.js';

function tenant(emailsPatch: Partial<TenantView['settings']['emails']> = {}, extra: Partial<TenantView['settings']> = {}): TenantView {
  return {
    id: 't1',
    slug: 'malaika',
    name: 'Malaika Showroom',
    domains: ['malaika.com.ar', 'www.malaika.com.ar'],
    settings: {
      ...DEFAULT_STORE_SETTINGS,
      storefrontUrl: 'https://malaika.com.ar',
      contactEmail: 'hola@malaika.com.ar',
      bankTransfer: { holder: 'Malaika SRL', cbu: '0000003100000000000001', alias: 'MALAIKA.SHOWROOM', bank: 'Banco Nación', cuit: '30-12345678-9' },
      ...extra,
      emails: { ...DEFAULT_STORE_SETTINGS.emails, ...emailsPatch },
    },
  };
}

describe('helpers de HTML', () => {
  it('escapa todo lo que llega de afuera', () => {
    expect(esc(`<img src=x onerror="alert('x')">&`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;');
    expect(esc(null)).toBe('');
  });

  it('solo acepta URLs http(s) y colores hex', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('https://a.com/x.png')).toBe('https://a.com/x.png');
    expect(safeColor('red; background:url(x)')).toBe('#1C1917');
    expect(safeColor('#abc')).toBe('#abc');
  });
});

describe('remitente', () => {
  it('separa nombre y dirección', () => {
    expect(parseAddress('"Tienda" <no-reply@plataforma.com>')).toEqual({ name: 'Tienda', address: 'no-reply@plataforma.com' });
    expect(parseAddress('Tienda <no-reply@plataforma.com>')).toEqual({ name: 'Tienda', address: 'no-reply@plataforma.com' });
    expect(parseAddress('no-reply@plataforma.com')).toEqual({ name: null, address: 'no-reply@plataforma.com' });
  });

  it('usa el nombre del comercio con la dirección de la plataforma por defecto', () => {
    expect(fromHeader(tenant(), 'Tienda <no-reply@plataforma.com>')).toBe('"Malaika Showroom" <no-reply@plataforma.com>');
  });

  it('usa la dirección propia solo si es de un dominio del comercio', () => {
    expect(fromHeader(tenant({ fromAddress: 'ventas@malaika.com.ar', senderName: 'Malaika' }), 'x@plataforma.com')).toBe(
      '"Malaika" <ventas@malaika.com.ar>',
    );
    expect(ownFromAddress(tenant({ fromAddress: 'hola@mail.malaika.com.ar' }))).toBe('hola@mail.malaika.com.ar');
    expect(ownFromAddress(tenant({ fromAddress: 'ventas@otra-tienda.com' }))).toBeNull();
    expect(ownFromAddress(tenant({ fromAddress: 'ventas@notmalaika.com.ar' }))).toBeNull();
    expect(fromHeader(tenant({ fromAddress: 'ventas@otra-tienda.com' }), 'x@plataforma.com')).toBe('"Malaika Showroom" <x@plataforma.com>');
  });

  it('no deja meter cabeceras ni comillas en el nombre', () => {
    expect(fromHeader(tenant({ senderName: 'Malaika"\r\nBcc: <a@b.c>' }), 'x@p.com')).toBe('"MalaikaBcc: a@b.c" <x@p.com>');
  });

  it('avisa al mail de contacto si no hay destinatarios cargados', () => {
    expect(adminRecipients(tenant())).toEqual(['hola@malaika.com.ar']);
    expect(adminRecipients(tenant({ adminRecipients: ['a@malaika.com.ar'] }))).toEqual(['a@malaika.com.ar']);
  });
});

describe('plantillas', () => {
  const brand = brandOf(tenant({ accentColor: '#8B5CF6' }));

  it('arma el link al pedido para que la tienda abra el seguimiento', () => {
    const order = sampleOrder('ARS');
    expect(emails.orderLink(brand, order)).toBe('https://malaika.com.ar/?pedido=MLK-123456&email=lucia%40ejemplo.com');
    expect(emails.orderLink({ ...brand, storefrontUrl: 'javascript:x' }, order)).toBeNull();
  });

  it('el mail de transferencia lleva los datos bancarios y el monto', () => {
    const mail = emails.orderReceivedTransfer(brand, sampleOrder('ARS', 'BANK_TRANSFER'));
    expect(mail.subject).toContain('MLK-123456');
    expect(mail.html).toContain('MALAIKA.SHOWROOM');
    expect(mail.text).toContain('CBU/CVU: 0000003100000000000001');
    expect(mail.html).toContain('#8B5CF6');
  });

  it('muestra la zona de envío y escapa los datos de la clienta', () => {
    const order = sampleOrder('ARS');
    order.customer.fullName = '<b>Ana</b> Pérez';
    order.items[0].name = 'Vestido <script>alert(1)</script>';
    const mail = emails.orderPaid(brand, order);
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<b>Ana</b>');
    expect(mail.html).toContain('Envío (CABA)');
  });

  it('el aviso de envío incluye el número de seguimiento', () => {
    const order = { ...sampleOrder('ARS'), trackingNumber: 'OCA-998877' };
    const mail = emails.orderShipped(brand, order);
    expect(mail.html).toContain('OCA-998877');
    expect(mail.text).toContain('OCA-998877');
  });

  it('distingue un pedido vencido de uno cancelado', () => {
    const order = sampleOrder('ARS', 'BANK_TRANSFER');
    expect(emails.orderCancelled(brand, order, true).subject).not.toBe(emails.orderCancelled(brand, order, false).subject);
  });

  it('todas las plantillas devuelven asunto, HTML y texto', () => {
    const order = sampleOrder('ARS');
    const all = [
      emails.orderReceivedTransfer(brand, sampleOrder('ARS', 'BANK_TRANSFER')),
      emails.orderPaid(brand, order),
      emails.orderShipped(brand, order),
      emails.orderDelivered(brand, order),
      emails.orderCancelled(brand, order, false),
      emails.adminNewOrder(brand, order, 'https://malaika.com.ar/admin/orders'),
      emails.welcome(brand, 'Lucía Fernández'),
      emails.testEmail(brand),
    ];
    for (const mail of all) {
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.html).toContain('<html');
      expect(mail.text.length).toBeGreaterThan(20);
    }
  });
});
