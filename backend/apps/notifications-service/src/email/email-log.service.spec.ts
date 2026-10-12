import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { EmailProvider } from '../providers/email-provider.js';
import { EmailLogService } from './email-log.service.js';

function setup(sendImpl: EmailProvider['send'] = async () => ({ id: 'p1' })) {
  const rows = new Map<string, Record<string, unknown>>();
  const prisma = {
    emailLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const key = `${data.tenantId}:${data.dedupeKey}`;
        if (rows.has(key)) throw Object.assign(new Error('unique'), { code: 'P2002' });
        const row = { id: `id${rows.size + 1}`, attempts: 0, ...data };
        rows.set(key, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...rows.values()].find((r) => r.id === where.id)!;
        Object.assign(row, { ...data, attempts: (row.attempts as number) + 1 });
        return row;
      }),
    },
  };
  const provider: EmailProvider = { name: 'fake', send: vi.fn(sendImpl) };
  const service = new EmailLogService(prisma as unknown as PrismaService, provider);
  return { service, provider, rows };
}

const req = {
  tenantId: 't1',
  type: 'order-paid',
  dedupeKey: 'order-paid:o1',
  to: ['lucia@ejemplo.com'],
  from: '"Malaika" <x@p.com>',
  subject: 'Pago confirmado',
  html: '<p>ok</p>',
  text: 'ok',
};

describe('EmailLogService', () => {
  it('manda una sola vez el mismo email aunque el evento llegue repetido', async () => {
    const { service, provider } = setup();
    const first = await service.send(req);
    const second = await service.send(req);
    expect(first?.status).toBe('SENT');
    expect(second).toBeNull();
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('registra sin mandar cuando el comercio apagó los emails', async () => {
    const { service, provider } = setup();
    const log = await service.send({ ...req, skip: true });
    expect(log?.status).toBe('SKIPPED');
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('deja el error anotado cuando el proveedor falla', async () => {
    const { service } = setup(async () => {
      throw new Error('dominio sin verificar');
    });
    const log = await service.send(req);
    expect(log?.status).toBe('FAILED');
    expect(log?.error).toBe('dominio sin verificar');
  });

  it('no hace nada sin destinatarios', async () => {
    const { service, provider } = setup();
    expect(await service.send({ ...req, to: [] })).toBeNull();
    expect(provider.send).not.toHaveBeenCalled();
  });
});
