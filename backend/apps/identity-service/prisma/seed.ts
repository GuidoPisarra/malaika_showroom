import { DEFAULT_STORE_SETTINGS, MALAIKA_TENANT_ID, StoreSettings } from '@malaika/common';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.IDENTITY_DATABASE_URL }) });

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name} para el seed`);
  return value;
}

const malaikaSettings: StoreSettings = {
  ...DEFAULT_STORE_SETTINGS,
  orderPrefix: 'MLK',
  // Las reglas que el front de Malaika tenía fijas en el código.
  shippingFee: 15000,
  freeShippingThreshold: 150000,
  bundleDiscounts: [
    { minItems: 2, percent: 5 },
    { minItems: 3, percent: 15 },
  ],
  bankTransferDiscountPercent: 5,
  storefrontUrl: process.env.MALAIKA_STOREFRONT_URL ?? 'http://localhost:4200',
};

async function main() {
  const superEmail = required('SUPERADMIN_EMAIL').toLowerCase();
  const existingSuper = await prisma.user.findFirst({ where: { tenantId: null, email: superEmail } });
  if (!existingSuper) {
    await prisma.user.create({
      data: {
        email: superEmail,
        name: 'Superadmin',
        role: 'SUPERADMIN',
        passwordHash: await bcrypt.hash(required('SUPERADMIN_PASSWORD'), 10),
      },
    });
  }

  await prisma.tenant.upsert({
    where: { id: MALAIKA_TENANT_ID },
    update: {},
    create: {
      id: MALAIKA_TENANT_ID,
      slug: 'malaika',
      name: 'Malaika Showroom',
      domains: ['malaika.localhost'],
      settings: malaikaSettings as object,
    },
  });

  const adminEmail = required('MALAIKA_ADMIN_EMAIL').toLowerCase();
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: MALAIKA_TENANT_ID, email: adminEmail } },
    update: {},
    create: {
      tenantId: MALAIKA_TENANT_ID,
      email: adminEmail,
      name: 'Admin Malaika',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(required('MALAIKA_ADMIN_PASSWORD'), 10),
    },
  });
  console.log('identity: superadmin, comercio "malaika" y su admin listos');
}

await main().finally(() => prisma.$disconnect());
