import { button, dateTime, esc, heading, infoBox, layout, money, paragraph, safeUrl } from './layout.js';
import type { Brand, OrderView, RenderedEmail } from './types.js';

/** Tipos de email que manda la plataforma. */
export const EMAIL_TYPES = [
  'order-received-transfer',
  'order-paid',
  'order-shipped',
  'order-delivered',
  'order-cancelled',
  'order-expired',
  'admin-new-order',
  'welcome',
  'test',
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

/** Link al pedido en la tienda: la tienda abre el seguimiento con estos datos. */
export function orderLink(brand: Brand, order: OrderView): string | null {
  const base = safeUrl(brand.storefrontUrl);
  if (!base) return null;
  const params = new URLSearchParams({ pedido: order.orderNumber, email: order.customer.email });
  return `${base.replace(/\/+$/, '')}/?${params}`;
}

function itemsTable(order: OrderView): string {
  const rows = order.items
    .map((item) => {
      const image = safeUrl(item.image);
      const variant = [item.size && item.size !== 'U' ? `Talle ${item.size}` : '', item.color?.name].filter(Boolean).join(' · ');
      return `<tr>
${image ? `<td style="padding:10px 12px 10px 0;width:56px;vertical-align:top"><img src="${esc(image)}" alt="" width="56" height="70" style="display:block;width:56px;height:70px;object-fit:cover;border-radius:8px;background:#f5f5f4"></td>` : ''}
<td${image ? '' : ' colspan="2"'} style="padding:10px 0;vertical-align:top;font-size:14px;color:#1c1917"><strong>${esc(item.name)}</strong><br><span style="font-size:12px;color:#78716c">${esc(variant)}${variant ? ' · ' : ''}x${item.quantity}</span></td>
<td style="padding:10px 0;vertical-align:top;text-align:right;font-size:14px;color:#1c1917;white-space:nowrap">${esc(money(item.unitPrice * item.quantity, order.currency))}</td>
</tr>`;
    })
    .join('');

  const t = order.totals;
  const line = (label: string, amount: number, negative = false, strong = false) =>
    `<tr><td colspan="2" style="padding:3px 0;font-size:${strong ? 16 : 13}px;color:${strong ? '#1c1917' : '#57534e'};${strong ? 'font-weight:bold;' : ''}">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-size:${strong ? 16 : 13}px;color:${strong ? '#1c1917' : '#57534e'};${strong ? 'font-weight:bold;' : ''}white-space:nowrap">${negative ? '-' : ''}${esc(money(amount, order.currency))}</td></tr>`;
  const totals = [
    line('Subtotal', t.subtotal),
    t.bundleDiscount ? line('Descuento por cantidad', t.bundleDiscount, true) : '',
    t.couponDiscount ? line(`Cupón ${t.couponCode ?? ''}`.trim(), t.couponDiscount, true) : '',
    `<tr><td colspan="2" style="padding:3px 0;font-size:13px;color:#57534e">Envío${order.customer.zone ? ` (${esc(order.customer.zone)})` : ''}</td><td style="padding:3px 0;text-align:right;font-size:13px;color:#57534e">${t.shipping ? esc(money(t.shipping, order.currency)) : 'Gratis'}</td></tr>`,
    t.paymentDiscount ? line('Descuento por transferencia', t.paymentDiscount, true) : '',
    `<tr><td colspan="3" style="padding:6px 0 0;border-top:1px solid #e7e5e4"></td></tr>`,
    line('Total', t.total, false, true),
  ].join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-top:1px solid #e7e5e4">${rows}
<tr><td colspan="3" style="padding:8px 0 0;border-top:1px solid #e7e5e4"></td></tr>${totals}</table>`;
}

function itemsText(order: OrderView): string {
  const lines = order.items.map((i) => `- ${i.name} (${[i.size, i.color?.name].filter(Boolean).join(', ')}) x${i.quantity}: ${money(i.unitPrice * i.quantity, order.currency)}`);
  return [...lines, `Envío: ${order.totals.shipping ? money(order.totals.shipping, order.currency) : 'gratis'}`, `Total: ${money(order.totals.total, order.currency)}`].join('\n');
}

function addressText(order: OrderView): string {
  const c = order.customer;
  return [[c.address, c.apartment].filter(Boolean).join(' '), [c.city, c.provinceState, c.postalCode].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' — ');
}

function textFooter(brand: Brand): string {
  return ['', '—', brand.name, [brand.contactEmail, brand.contactPhone].filter(Boolean).join(' · '), brand.storefrontUrl].filter(Boolean).join('\n');
}

export function orderReceivedTransfer(brand: Brand, order: OrderView): RenderedEmail {
  const bank = brand.bankTransfer;
  const amount = money(order.totals.total, order.currency);
  const until = dateTime(order.expiresAt);
  const html = layout(
    brand,
    `Transferí ${amount} para confirmar tu pedido ${order.orderNumber}`,
    [
      heading(`¡Reservamos tu pedido, ${firstName(order.customer.fullName)}!`),
      paragraph(
        `Tu pedido <strong>${esc(order.orderNumber)}</strong> está reservado. Para confirmarlo, transferí <strong>${esc(amount)}</strong>${until ? ` antes del <strong>${esc(until)}</strong>` : ''} e indicá el número de pedido en el concepto.`,
      ),
      bank
        ? infoBox(
            [
              ['Monto', amount],
              ['CBU / CVU', bank.cbu],
              ['Alias', bank.alias],
              ['Titular', bank.holder],
              ['Banco', bank.bank],
              ['CUIT', bank.cuit ?? ''],
              ['Concepto', order.orderNumber],
            ],
            'Datos para transferir',
          )
        : paragraph('En breve te escribimos con los datos para transferir.'),
      paragraph('Cuando recibamos la transferencia te avisamos por este medio y preparamos tu pedido. Si pasa la fecha sin pago, la reserva se libera.'),
      itemsTable(order),
      button(brand, 'Ver mi pedido', orderLink(brand, order)),
    ].join('\n'),
  );
  const text = [
    `¡Reservamos tu pedido, ${firstName(order.customer.fullName)}!`,
    '',
    `Para confirmar el pedido ${order.orderNumber}, transferí ${amount}${until ? ` antes del ${until}` : ''} indicando el número de pedido.`,
    bank ? `\nCBU/CVU: ${bank.cbu}\nAlias: ${bank.alias}\nTitular: ${bank.holder}\nBanco: ${bank.bank}${bank.cuit ? `\nCUIT: ${bank.cuit}` : ''}` : '',
    '',
    itemsText(order),
    orderLink(brand, order) ?? '',
    textFooter(brand),
  ].join('\n');
  return { subject: `Reservamos tu pedido ${order.orderNumber}: falta la transferencia`, html, text };
}

export function orderPaid(brand: Brand, order: OrderView): RenderedEmail {
  const html = layout(
    brand,
    `Recibimos el pago de tu pedido ${order.orderNumber}`,
    [
      heading(`¡Gracias por tu compra, ${firstName(order.customer.fullName)}!`),
      paragraph(`Recibimos el pago de tu pedido <strong>${esc(order.orderNumber)}</strong> y ya lo estamos preparando. Te avisamos cuando salga.`),
      itemsTable(order),
      infoBox(
        [
          ['Dirección', addressText(order)],
          ['Entrega estimada', order.customer.eta ?? ''],
        ],
        'Envío',
      ),
      button(brand, 'Ver mi pedido', orderLink(brand, order)),
    ].join('\n'),
  );
  const text = [
    `¡Gracias por tu compra, ${firstName(order.customer.fullName)}!`,
    '',
    `Recibimos el pago del pedido ${order.orderNumber} y ya lo estamos preparando.`,
    '',
    itemsText(order),
    `Envío a: ${addressText(order)}`,
    orderLink(brand, order) ?? '',
    textFooter(brand),
  ].join('\n');
  return { subject: `¡Pago confirmado! Pedido ${order.orderNumber}`, html, text };
}

export function orderShipped(brand: Brand, order: OrderView): RenderedEmail {
  const html = layout(
    brand,
    `Tu pedido ${order.orderNumber} ya salió`,
    [
      heading('¡Tu pedido está en camino!'),
      paragraph(`Despachamos tu pedido <strong>${esc(order.orderNumber)}</strong>.${order.customer.eta ? ` Llega en ${esc(order.customer.eta)}.` : ''}`),
      infoBox(
        [
          ['Seguimiento', order.trackingNumber ?? ''],
          ['Dirección', addressText(order)],
        ],
        'Envío',
      ),
      button(brand, 'Ver mi pedido', orderLink(brand, order)),
    ].join('\n'),
  );
  const text = [
    '¡Tu pedido está en camino!',
    '',
    `Despachamos tu pedido ${order.orderNumber}.${order.customer.eta ? ` Llega en ${order.customer.eta}.` : ''}`,
    order.trackingNumber ? `Número de seguimiento: ${order.trackingNumber}` : '',
    `Dirección: ${addressText(order)}`,
    orderLink(brand, order) ?? '',
    textFooter(brand),
  ].join('\n');
  return { subject: `Tu pedido ${order.orderNumber} está en camino`, html, text };
}

export function orderDelivered(brand: Brand, order: OrderView): RenderedEmail {
  const html = layout(
    brand,
    `Tu pedido ${order.orderNumber} fue entregado`,
    [
      heading('¡Tu pedido llegó!'),
      paragraph(`El pedido <strong>${esc(order.orderNumber)}</strong> figura como entregado. Esperamos que lo disfrutes.`),
      paragraph(`Si algo no está bien, respondé este email${brand.contactPhone ? ` o escribinos al ${esc(brand.contactPhone)}` : ''} y lo resolvemos.`),
      button(brand, 'Volver a la tienda', brand.storefrontUrl),
    ].join('\n'),
  );
  const text = [
    '¡Tu pedido llegó!',
    '',
    `El pedido ${order.orderNumber} figura como entregado. Si algo no está bien, respondé este email y lo resolvemos.`,
    textFooter(brand),
  ].join('\n');
  return { subject: `Tu pedido ${order.orderNumber} fue entregado`, html, text };
}

export function orderCancelled(brand: Brand, order: OrderView, expired: boolean): RenderedEmail {
  const subject = expired ? `Venció la reserva del pedido ${order.orderNumber}` : `Cancelamos tu pedido ${order.orderNumber}`;
  const intro = expired
    ? `La reserva del pedido <strong>${esc(order.orderNumber)}</strong> venció porque no recibimos el pago a tiempo, así que liberamos las prendas.`
    : `Cancelamos tu pedido <strong>${esc(order.orderNumber)}</strong>.`;
  const html = layout(
    brand,
    expired ? 'Liberamos las prendas reservadas' : 'Tu pedido fue cancelado',
    [
      heading(expired ? 'Tu reserva venció' : 'Pedido cancelado'),
      paragraph(intro),
      paragraph(
        expired
          ? 'Si todavía las querés, podés volver a comprarlas mientras haya stock. Si ya transferiste, respondé este email con el comprobante y lo resolvemos.'
          : 'Si ya habías pagado, te contactamos para el reintegro. Ante cualquier duda, respondé este email.',
      ),
      button(brand, 'Volver a la tienda', brand.storefrontUrl),
    ].join('\n'),
  );
  const text = [subject, '', intro.replace(/<[^>]+>/g, ''), textFooter(brand)].join('\n');
  return { subject, html, text };
}

/** Aviso al comercio de un pedido nuevo (pagado o esperando la transferencia). */
export function adminNewOrder(brand: Brand, order: OrderView, adminUrl: string | null): RenderedEmail {
  const pendingTransfer = order.paymentMethod === 'BANK_TRANSFER' && order.status === 'PENDING_PAYMENT';
  const amount = money(order.totals.total, order.currency);
  const subject = pendingTransfer
    ? `Nuevo pedido ${order.orderNumber} por transferencia (${amount}), esperando pago`
    : `Nuevo pedido pagado ${order.orderNumber} (${amount})`;
  const html = layout(
    brand,
    subject,
    [
      heading(pendingTransfer ? 'Pedido nuevo: esperando transferencia' : 'Pedido nuevo pagado'),
      paragraph(
        pendingTransfer
          ? `Entró el pedido <strong>${esc(order.orderNumber)}</strong> por transferencia. Cuando veas el pago, marcalo como pagado en el panel.`
          : `Entró el pedido <strong>${esc(order.orderNumber)}</strong> y ya está pagado. Está listo para preparar.`,
      ),
      infoBox(
        [
          ['Clienta', order.customer.fullName],
          ['Email', order.customer.email],
          ['Teléfono', order.customer.phone ?? ''],
          ['Envío', `${addressText(order)}${order.customer.zone ? ` (${order.customer.zone})` : ''}`],
          ['Pago', order.paymentMethod === 'BANK_TRANSFER' ? 'Transferencia' : 'Mercado Pago'],
        ],
        'Datos del pedido',
      ),
      itemsTable(order),
      button(brand, 'Abrir en el panel', adminUrl),
    ].join('\n'),
  );
  const text = [subject, '', `Clienta: ${order.customer.fullName} <${order.customer.email}>`, `Envío: ${addressText(order)}`, '', itemsText(order), adminUrl ?? ''].join('\n');
  return { subject, html, text };
}

export function welcome(brand: Brand, name: string): RenderedEmail {
  const html = layout(
    brand,
    `Tu cuenta en ${brand.name} está lista`,
    [
      heading(`¡Hola, ${firstName(name)}!`),
      paragraph(`Ya tenés tu cuenta en <strong>${esc(brand.name)}</strong>. Con ella podés seguir tus pedidos y guardar los looks que armes en el maniquí.`),
      button(brand, 'Ir a la tienda', brand.storefrontUrl),
    ].join('\n'),
  );
  const text = [`¡Hola, ${firstName(name)}!`, '', `Ya tenés tu cuenta en ${brand.name}.`, brand.storefrontUrl, textFooter(brand)].join('\n');
  return { subject: `Tu cuenta en ${brand.name} está lista`, html, text };
}

export function testEmail(brand: Brand): RenderedEmail {
  const html = layout(
    brand,
    'Los emails de tu tienda funcionan',
    [
      heading('Email de prueba'),
      paragraph(`Si ves este mensaje, los emails de <strong>${esc(brand.name)}</strong> salen bien. Así los van a ver tus clientas.`),
      button(brand, 'Ir a la tienda', brand.storefrontUrl),
    ].join('\n'),
  );
  return { subject: `Prueba de emails de ${brand.name}`, html, text: `Si ves este mensaje, los emails de ${brand.name} salen bien.${textFooter(brand)}` };
}
