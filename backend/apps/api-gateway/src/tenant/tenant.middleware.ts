import { TenantContext } from '@malaika/common';
import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantResolver } from './tenant-resolver.service.js';

export type TenantRequest = Request & { tenant: TenantContext };

/**
 * Identifica el comercio por el dominio de la tienda (header Host o, detrás de
 * un proxy, X-Forwarded-Host). En desarrollo, si el dominio no coincide con
 * ninguno, usa DEFAULT_TENANT_SLUG. También acepta X-Tenant con el slug.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly resolver: TenantResolver) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const explicit = req.header('x-tenant');
    const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '').split(',')[0].trim();

    let tenant = explicit ? await this.resolver.bySlug(explicit) : await this.resolver.byHost(host);
    if (!tenant && !explicit && process.env.DEFAULT_TENANT_SLUG) {
      tenant = await this.resolver.bySlug(process.env.DEFAULT_TENANT_SLUG);
    }
    if (!tenant) throw new NotFoundException('No encontramos la tienda para este dominio');
    (req as TenantRequest).tenant = tenant;
    next();
  }
}
