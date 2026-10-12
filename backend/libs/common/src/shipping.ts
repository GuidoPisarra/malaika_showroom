import type { ShippingZone, StoreSettings } from './tenant.js';

export interface ShippingDestination {
  postalCode?: string | null;
  provinceState?: string | null;
}

/** Costo de envío para una dirección, según las zonas del comercio. */
export interface ShippingQuote {
  available: boolean;
  zoneId: string | null;
  zoneName: string | null;
  fee: number;
  freeShippingThreshold: number;
  eta: string | null;
}

/**
 * Extrae los 4 dígitos del código postal argentino, tanto del formato viejo
 * ("1425") como del CPA ("C1425ABC"). Devuelve null si no los encuentra.
 */
export function normalizePostalCode(value: string | null | undefined): number | null {
  const match = (value ?? '').toUpperCase().replace(/\s+/g, '').match(/^[A-Z]?(\d{4})[A-Z]{0,3}$/);
  return match ? Number(match[1]) : null;
}

/** "Córdoba " y "cordoba" son la misma provincia. */
export function normalizeProvince(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Acepta "1425" o "1000-1499". Devuelve null si el texto no es un rango válido. */
export function parsePostalRange(value: string): [number, number] | null {
  const match = value.trim().match(/^(\d{4})(?:\s*-\s*(\d{4}))?$/);
  if (!match) return null;
  const from = Number(match[1]);
  const to = match[2] ? Number(match[2]) : from;
  return from <= to ? [from, to] : null;
}

function matchesPostalCode(zone: ShippingZone, cp: number): boolean {
  return zone.postalCodes.some((range) => {
    const parsed = parsePostalRange(range);
    return parsed !== null && cp >= parsed[0] && cp <= parsed[1];
  });
}

function quoteFor(zone: ShippingZone, settings: StoreSettings): ShippingQuote {
  return {
    available: true,
    zoneId: zone.id,
    zoneName: zone.name,
    fee: zone.fee,
    freeShippingThreshold: zone.freeShippingThreshold ?? settings.freeShippingThreshold,
    eta: zone.eta || null,
  };
}

/**
 * Busca la zona de una dirección: primero por código postal (es lo más preciso),
 * después por provincia. Si no cae en ninguna, usa el costo general del comercio
 * o informa que no hay envío, según shipsOutsideZones.
 */
export function resolveShipping(settings: StoreSettings, destination: ShippingDestination = {}): ShippingQuote {
  const zones = settings.shippingZones ?? [];
  const cp = normalizePostalCode(destination.postalCode);
  const province = normalizeProvince(destination.provinceState);

  const byPostalCode = cp === null ? undefined : zones.find((z) => matchesPostalCode(z, cp));
  if (byPostalCode) return quoteFor(byPostalCode, settings);

  const byProvince = province ? zones.find((z) => z.provinces.some((p) => normalizeProvince(p) === province)) : undefined;
  if (byProvince) return quoteFor(byProvince, settings);

  return {
    available: settings.shipsOutsideZones !== false || zones.length === 0,
    zoneId: null,
    zoneName: null,
    fee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    eta: null,
  };
}
