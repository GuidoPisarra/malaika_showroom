import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantRequest } from './tenant.middleware.js';

/** Comercio resuelto para el request actual. */
export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<TenantRequest>().tenant,
);
