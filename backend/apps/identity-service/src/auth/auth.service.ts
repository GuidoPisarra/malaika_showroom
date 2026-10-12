import { AuthTokens, JwtPayload, badRequest, conflict, forbidden, notFound, unauthorized } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RegisterInput {
  tenantId: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginInput {
  tenantId: string;
  email: string;
  password: string;
}

const ACCESS_TTL = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
const MIN_PASSWORD = 8;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, tenantId: user.tenantId };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthTokens> {
    if (!input.password || input.password.length < MIN_PASSWORD) {
      throw badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
    }
    const email = input.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { tenantId_email: { tenantId: input.tenantId, email } } });
    if (exists) throw conflict('Ya existe una cuenta con ese correo');

    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email,
        name: input.name.trim(),
        phone: input.phone,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: 'CUSTOMER',
      },
    });
    return this.issueTokens(user);
  }

  /** Login de clientas y admins de un comercio. */
  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email: input.email.trim().toLowerCase() } },
    });
    return this.checkPasswordAndIssue(user, input.password);
  }

  /** Login del superadmin de la plataforma (no pertenece a ningún comercio). */
  async platformLogin(input: { email: string; password: string }): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { tenantId: null, role: 'SUPERADMIN', email: input.email.trim().toLowerCase() },
    });
    return this.checkPasswordAndIssue(user, input.password);
  }

  async refresh(input: { refreshToken: string }): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(input.refreshToken ?? '') },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.active) {
      throw unauthorized('La sesión venció, volvé a ingresar');
    }
    // Rotación: cada refresh token se usa una sola vez.
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.user);
  }

  async logout(input: { refreshToken: string }): Promise<{ ok: true }> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(input.refreshToken ?? ''), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(input: { userId: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw notFound('Usuario');
    return publicUser(user);
  }

  async listUsers(input: { tenantId: string; role?: 'CUSTOMER' | 'ADMIN'; page?: number; pageSize?: number }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const where = { tenantId: input.tenantId, ...(input.role ? { role: input.role } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map(publicUser), total, page, pageSize };
  }

  async createAdmin(input: RegisterInput) {
    if (!input.password || input.password.length < MIN_PASSWORD) {
      throw badRequest(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
    }
    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        passwordHash: await bcrypt.hash(input.password, 10),
        role: 'ADMIN',
      },
    });
    return publicUser(user);
  }

  private async checkPasswordAndIssue(user: User | null, password: string): Promise<AuthTokens> {
    // Compara siempre para no revelar por tiempo de respuesta si el correo existe.
    const ok = await bcrypt.compare(password ?? '', user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!user || !ok) throw unauthorized('Correo o contraseña incorrectos');
    if (!user.active) throw forbidden('La cuenta está desactivada');
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      expiresIn: ACCESS_TTL,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
    };
  }
}
