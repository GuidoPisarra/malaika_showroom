import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmailLog } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EMAIL_PROVIDER } from '../providers/email-provider.js';
import type { EmailProvider } from '../providers/email-provider.js';

export const MAX_ATTEMPTS = 5;

export interface EmailRequest {
  tenantId: string;
  type: string;
  /** Mismo valor = mismo email: si ya existe no se vuelve a mandar. */
  dedupeKey: string;
  orderId?: string | null;
  orderNumber?: string | null;
  to: string[];
  from: string;
  replyTo?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Se registra pero no se manda (por ejemplo, el comercio apagó los emails). */
  skip?: boolean;
}

/** Guarda cada email antes de mandarlo, evita duplicados y reintenta los que fallan. */
@Injectable()
export class EmailLogService {
  private readonly logger = new Logger('Emails');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  /** Devuelve el registro, o null si ese email ya se había procesado. */
  async send(req: EmailRequest): Promise<EmailLog | null> {
    if (!req.to.length) return null;
    let log: EmailLog;
    try {
      log = await this.prisma.emailLog.create({
        data: {
          tenantId: req.tenantId,
          type: req.type,
          dedupeKey: req.dedupeKey,
          orderId: req.orderId ?? null,
          orderNumber: req.orderNumber ?? null,
          to: req.to.join(', '),
          fromHeader: req.from,
          replyTo: req.replyTo ?? null,
          subject: req.subject,
          html: req.html,
          text: req.text,
          status: req.skip ? 'SKIPPED' : 'PENDING',
        },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') return null;
      throw err;
    }
    return req.skip ? log : this.deliver(log);
  }

  /** Intenta entregar un email guardado y anota el resultado. */
  async deliver(log: EmailLog): Promise<EmailLog> {
    try {
      const result = await this.provider.send({
        from: log.fromHeader,
        to: log.to.split(',').map((t) => t.trim()),
        replyTo: log.replyTo,
        subject: log.subject,
        html: log.html,
        text: log.text,
        idempotencyKey: `${log.tenantId}:${log.dedupeKey}`,
        tags: { type: log.type, tenant: log.tenantId },
      });
      return await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          provider: this.provider.name,
          providerId: result.id,
          error: null,
          attempts: { increment: 1 },
          sentAt: new Date(),
        },
      });
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      this.logger.warn(`No se pudo mandar "${log.subject}" a ${log.to}: ${message}`);
      return this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED', provider: this.provider.name, error: message.slice(0, 1000), attempts: { increment: 1 } },
      });
    }
  }

  /** Reintenta los emails que fallaron (o quedaron colgados) en los últimos dos días. */
  async retryFailed(): Promise<number> {
    const pending = await this.prisma.emailLog.findMany({
      where: {
        attempts: { lt: MAX_ATTEMPTS },
        createdAt: { gt: new Date(Date.now() - 2 * 24 * 3600_000) },
        OR: [
          { status: 'FAILED' },
          // Quedaron pendientes si el servicio se cortó justo antes de mandarlos.
          { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 10 * 60_000) } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    for (const log of pending) await this.deliver(log);
    return pending.length;
  }

  async list(input: { tenantId: string; orderId?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 20));
    const where = { tenantId: input.tenantId, ...(input.orderId ? { orderId: input.orderId } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          orderId: true,
          orderNumber: true,
          to: true,
          subject: true,
          status: true,
          error: true,
          attempts: true,
          sentAt: true,
          createdAt: true,
        },
      }),
      this.prisma.emailLog.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({ ...r, sentAt: r.sentAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
      total,
      page,
      pageSize,
    };
  }
}
