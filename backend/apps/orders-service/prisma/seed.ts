import { MALAIKA_TENANT_ID } from '@malaika/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.ORDERS_DATABASE_URL }) });

/** Los cupones que el front tenía hardcodeados. */
const coupons = [
  { code: 'MALAIKA10', percent: 10, description: '10% de descuento especial en tu orden' },
  { code: 'VIP20', percent: 20, description: '20% de descuento exclusivo VIP' },
  { code: 'BIENVENIDA', fixedAmount: 20000, description: 'Descuento de bienvenida de $20.000' },
];

async function main() {
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { tenantId_code: { tenantId: MALAIKA_TENANT_ID, code: c.code } },
      update: {},
      create: { ...c, tenantId: MALAIKA_TENANT_ID },
    });
  }
  console.log(`orders: ${coupons.length} cupones de ejemplo listos`);
}

await main().finally(() => prisma.$disconnect());
