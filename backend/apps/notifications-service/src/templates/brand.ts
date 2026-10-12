import { safeColor } from './layout.js';
import type { Brand, TenantView } from './types.js';

export function brandOf(tenant: TenantView): Brand {
  const s = tenant.settings;
  return {
    name: s.emails.senderName?.trim() || tenant.name,
    logoUrl: s.emails.logoUrl,
    accent: safeColor(s.emails.accentColor),
    storefrontUrl: s.storefrontUrl,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    currency: s.currency,
    bankTransfer: s.bankTransfer,
  };
}

/** Separa "Nombre <email@dominio>" en sus partes. */
export function parseAddress(value: string): { name: string | null; address: string } {
  const match = value.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim() || null, address: match[2].trim() };
  return { name: null, address: value.trim() };
}

/**
 * La dirección propia del comercio solo se usa si es de uno de sus dominios.
 * Todos los dominios verificados viven en la misma cuenta del proveedor, así que
 * sin este control un comercio podría mandar mails con el dominio de otro.
 */
export function ownFromAddress(tenant: TenantView): string | null {
  const address = tenant.settings.emails.fromAddress?.trim().toLowerCase();
  if (!address) return null;
  const domain = address.split('@')[1];
  if (!domain) return null;
  const owned = (tenant.domains ?? []).map((d) => d.toLowerCase().replace(/^www\./, ''));
  return owned.some((d) => domain === d || domain.endsWith(`.${d}`)) ? address : null;
}

/** Arma el remitente: nombre del comercio con su dirección propia o la de la plataforma. */
export function fromHeader(tenant: TenantView, platformFrom: string): string {
  const platform = parseAddress(platformFrom);
  const address = ownFromAddress(tenant) ?? platform.address;
  const name = (tenant.settings.emails.senderName?.trim() || tenant.name).replace(/["\\\r\n<>]/g, '');
  return `"${name}" <${address}>`;
}

/** Destinatarios del aviso al comercio. */
export function adminRecipients(tenant: TenantView): string[] {
  const list = tenant.settings.emails.adminRecipients.filter(Boolean);
  if (list.length) return list;
  return tenant.settings.contactEmail ? [tenant.settings.contactEmail] : [];
}
