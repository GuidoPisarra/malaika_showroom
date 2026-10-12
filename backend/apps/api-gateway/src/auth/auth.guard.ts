import type { JwtPayload, Role } from '@malaika/common';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  applyDecorators,
  UseGuards,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { TenantRequest } from '../tenant/tenant.middleware.js';

const AUTH_KEY = 'malaika:auth';

interface AuthOptions {
  roles?: Role[];
  optional?: boolean;
}

export type AuthRequest = Request & Partial<TenantRequest> & { user?: JwtPayload };

/**
 * Valida el JWT emitido por identity-service.
 * - Sin roles: cualquier usuario logueado.
 * - Con roles: solo esos roles (SUPERADMIN pasa siempre).
 * - optional: deja pasar sin token, pero si hay uno lo valida.
 * Además exige que el usuario pertenezca al comercio del request.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<AuthOptions>(AUTH_KEY, [ctx.getHandler(), ctx.getClass()]) ?? {};
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      if (opts.optional) return true;
      throw new UnauthorizedException('Necesitás iniciar sesión');
    }

    let user: JwtPayload;
    try {
      user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('La sesión venció, volvé a ingresar');
    }

    const isSuper = user.role === 'SUPERADMIN';
    if (req.tenant && !isSuper && user.tenantId !== req.tenant.id) {
      throw new ForbiddenException('Tu cuenta no pertenece a esta tienda');
    }
    if (opts.roles?.length && !isSuper && !opts.roles.includes(user.role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    req.user = user;
    return true;
  }
}

export const Auth = (...roles: Role[]) => applyDecorators(SetMetadata(AUTH_KEY, { roles }), UseGuards(AuthGuard));
export const OptionalAuth = () => applyDecorators(SetMetadata(AUTH_KEY, { optional: true }), UseGuards(AuthGuard));

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthRequest>().user,
);
