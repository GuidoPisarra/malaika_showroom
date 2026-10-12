import { DEFAULT_EMAIL_SETTINGS, DEFAULT_STORE_SETTINGS, StoreSettings, TenantContext } from '@malaika/common';
import type { Tenant } from '../generated/prisma/client.js';

export function mergeSettings(stored: unknown, patch: Partial<StoreSettings> = {}): StoreSettings {
  const saved = (stored ?? {}) as Partial<StoreSettings>;
  const base = { ...DEFAULT_STORE_SETTINGS, ...saved };
  const merged = { ...base, ...stripUndefined(patch) };
  // Los emails se combinan campo por campo, así un comercio viejo recibe los valores nuevos por defecto.
  merged.emails = { ...DEFAULT_EMAIL_SETTINGS, ...saved.emails, ...stripUndefined(patch.emails ?? {}) };
  return merged;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function toTenantContext(tenant: Tenant): TenantContext {
  return { id: tenant.id, slug: tenant.slug, name: tenant.name, settings: mergeSettings(tenant.settings) };
}

export function toTenantAdminView(tenant: Tenant) {
  return { ...toTenantContext(tenant), domains: tenant.domains, active: tenant.active, createdAt: tenant.createdAt };
}
