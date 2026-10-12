import { badRequest, notFound } from '@malaika/common';
import { Injectable } from '@nestjs/common';
import type { Coupon } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CouponInput {
  id?: string;
  code: string;
  description?: string;
  percent?: number | null;
  fixedAmount?: number | null;
  minSubtotal?: number | null;
  maxUses?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
}

/** Lo que necesita el carrito del front (CouponDiscount). */
export function toCouponDiscount(c: Coupon) {
  return {
    code: c.code,
    percent: c.percent ?? 0,
    fixedAmount: c.fixedAmount ?? undefined,
    minSubtotal: c.minSubtotal ?? undefined,
    description: c.description,
  };
}

const normalizeCode = (code: string) => (code ?? '').trim().toUpperCase();

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devuelve el cupón si se puede usar ahora con ese subtotal; si no, explica por qué. */
  async findUsable(tenantId: string, rawCode: string, subtotal?: number): Promise<Coupon> {
    const code = normalizeCode(rawCode);
    if (!code) throw badRequest('Ingresá un código promocional', 'COUPON_EMPTY');
    const coupon = await this.prisma.coupon.findUnique({ where: { tenantId_code: { tenantId, code } } });
    const now = new Date();
    if (
      !coupon ||
      !coupon.active ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.endsAt && coupon.endsAt < now) ||
      (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    ) {
      throw badRequest('Código no válido o vencido', 'COUPON_INVALID');
    }
    if (subtotal !== undefined && coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      throw badRequest(`Este cupón requiere una compra mínima de $${coupon.minSubtotal.toLocaleString('es-AR')}`, 'COUPON_MIN');
    }
    return coupon;
  }

  async validate(tenantId: string, code: string, subtotal?: number) {
    return toCouponDiscount(await this.findUsable(tenantId, code, subtotal));
  }

  list(tenantId: string) {
    return this.prisma.coupon.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  /** Crea un cupón o actualiza solo los campos recibidos de uno existente. */
  async upsert(tenantId: string, input: Partial<CouponInput>) {
    const { id, startsAt, endsAt, code, ...rest } = input;
    const existing = id ? await this.prisma.coupon.findFirst({ where: { id, tenantId } }) : null;
    if (id && !existing) throw notFound('Cupón');

    const percent = rest.percent !== undefined ? rest.percent : existing?.percent;
    const fixedAmount = rest.fixedAmount !== undefined ? rest.fixedAmount : existing?.fixedAmount;
    if (!percent && !fixedAmount) throw badRequest('El cupón necesita un porcentaje o un monto fijo');
    if (percent && (percent < 1 || percent > 100)) throw badRequest('El porcentaje debe estar entre 1 y 100');
    if (!existing && !code) throw badRequest('Ingresá el código del cupón');

    const data = {
      ...rest,
      ...(code !== undefined ? { code: normalizeCode(code) } : {}),
      ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
    };
    if (!existing) return this.prisma.coupon.create({ data: { ...data, code: normalizeCode(code!), tenantId } });
    return this.prisma.coupon.update({ where: { id: existing.id }, data });
  }

  async remove(tenantId: string, id: string) {
    const deleted = await this.prisma.coupon.deleteMany({ where: { id, tenantId } });
    if (!deleted.count) throw notFound('Cupón');
    return { ok: true };
  }
}
