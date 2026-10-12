import {
  BROKER,
  EVENTS,
  StoreSettings,
  TenantContext,
  badRequest,
  conflict,
  notFound,
  publish,
} from '@malaika/common';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import bcrypt from 'bcryptjs';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { mergeSettings, toTenantAdminView, toTenantContext } from './tenant.mapper.js';

export interface CreateTenantInput {
  slug: string;
  name: string;
  domains?: string[];
  settings?: Partial<StoreSettings>;
  admin: { email: string; password: string; name: string };
}

export interface UpdateTenantInput {
  tenantId: string;
  name?: string;
  domains?: string[];
  active?: boolean;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;

export function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '');
}

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BROKER) private readonly broker: ClientProxy,
  ) {}

  async resolve(input: { host?: string; slug?: string }): Promise<TenantContext> {
    const where: Prisma.TenantWhereInput = input.slug
      ? { slug: input.slug.toLowerCase() }
      : { domains: { has: normalizeHost(input.host ?? '') } };
    const tenant = await this.prisma.tenant.findFirst({ where: { ...where, active: true } });
    if (!tenant) throw notFound('Comercio');
    return toTenantContext(tenant);
  }

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw notFound('Comercio');
    return toTenantAdminView(tenant);
  }

  async list() {
    const tenants = await this.prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } });
    return tenants.map(toTenantAdminView);
  }

  async create(input: CreateTenantInput) {
    const slug = input.slug.toLowerCase();
    if (!SLUG_RE.test(slug)) throw badRequest('El identificador solo admite minúsculas, números y guiones');
    if (await this.prisma.tenant.findUnique({ where: { slug } })) throw conflict('Ya existe un comercio con ese identificador');

    const settings = mergeSettings({}, { orderPrefix: slug.slice(0, 3).toUpperCase(), ...input.settings });
    const tenant = await this.prisma.tenant.create({
      data: {
        slug,
        name: input.name,
        domains: (input.domains ?? []).map(normalizeHost),
        settings: settings as unknown as Prisma.InputJsonValue,
        users: {
          create: {
            email: input.admin.email.toLowerCase(),
            name: input.admin.name,
            passwordHash: await bcrypt.hash(input.admin.password, 10),
            role: 'ADMIN',
          },
        },
      },
    });
    return toTenantAdminView(tenant);
  }

  async update(input: UpdateTenantInput) {
    const tenant = await this.prisma.tenant.update({
      where: { id: input.tenantId },
      data: {
        name: input.name,
        active: input.active,
        domains: input.domains?.map(normalizeHost),
      },
    });
    await publish(this.broker, EVENTS.tenantUpdated, { tenantId: tenant.id });
    return toTenantAdminView(tenant);
  }

  async updateSettings(input: { tenantId: string; settings: Partial<StoreSettings> }) {
    const current = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!current) throw notFound('Comercio');
    const settings = mergeSettings(current.settings, input.settings);
    const tenant = await this.prisma.tenant.update({
      where: { id: input.tenantId },
      data: { settings: settings as unknown as Prisma.InputJsonValue },
    });
    await publish(this.broker, EVENTS.tenantUpdated, { tenantId: tenant.id });
    return toTenantAdminView(tenant);
  }
}
