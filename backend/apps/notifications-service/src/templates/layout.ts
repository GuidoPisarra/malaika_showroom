import type { Brand } from './types.js';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para HTML. Todo lo que viene de clientas o del comercio pasa por acá. */
export const esc = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

/** Solo URLs http(s): evita que un dato cargado en el panel inyecte un esquema raro. */
export function safeUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

/** Acepta solo colores #RGB o #RRGGBB; si no, el color por defecto. */
export function safeColor(color: string | null | undefined, fallback = '#1C1917'): string {
  return color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;
}

export function button(brand: Brand, label: string, href: string | null): string {
  const url = safeUrl(href);
  if (!url) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:10px;background:${brand.accent}">
<a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px">${esc(label)}</a>
</td></tr></table>`;
}

export function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#44403c">${html}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:normal;color:#1c1917">${esc(text)}</h1>`;
}

/** Recuadro gris para datos (transferencia, seguimiento, dirección). */
export function infoBox(rows: Array<[string, string]>, title?: string): string {
  const body = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#78716c;white-space:nowrap;vertical-align:top">${esc(label)}</td><td style="padding:4px 0;font-size:14px;color:#1c1917;font-weight:bold">${esc(value)}</td></tr>`,
    )
    .join('');
  return `<div style="margin:18px 0;padding:16px 18px;background:#f5f5f4;border-radius:12px">
${title ? `<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#78716c;margin-bottom:8px">${esc(title)}</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0">${body}</table></div>`;
}

/**
 * Esqueleto común: compatible con Gmail, Outlook y Apple Mail (tablas y
 * estilos en línea), con un texto de vista previa oculto.
 */
export function layout(brand: Brand, preheader: string, content: string): string {
  const logo = safeUrl(brand.logoUrl);
  const header = logo
    ? `<img src="${esc(logo)}" alt="${esc(brand.name)}" height="40" style="display:block;height:40px;max-width:220px;border:0">`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1c1917">${esc(brand.name)}</span>`;
  const store = safeUrl(brand.storefrontUrl);
  const contact = [brand.contactEmail, brand.contactPhone].filter(Boolean).map(esc).join(' · ');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(brand.name)}</title></head>
<body style="margin:0;padding:0;background:#faf8f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;border:1px solid #e7e5e4">
<tr><td style="padding:26px 32px 18px;border-bottom:3px solid ${brand.accent}">${store ? `<a href="${esc(store)}" style="text-decoration:none">${header}</a>` : header}</td></tr>
<tr><td style="padding:28px 32px 12px;font-family:Arial,Helvetica,sans-serif">${content}</td></tr>
<tr><td style="padding:18px 32px 26px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#a8a29e;border-top:1px solid #f5f5f4">
${esc(brand.name)}${contact ? `<br>${contact}` : ''}${store ? `<br><a href="${esc(store)}" style="color:#a8a29e">${esc(store.replace(/^https?:\/\//, ''))}</a>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}
