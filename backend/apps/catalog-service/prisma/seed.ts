import { MALAIKA_TENANT_ID } from '@malaika/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.CATALOG_DATABASE_URL }) });
const load = (file: string) => JSON.parse(readFileSync(new URL(`./seed-data/${file}`, import.meta.url), 'utf8'));

/** Carga el catálogo que antes estaba hardcodeado en el front. Solo si el comercio no tiene productos. */
async function main() {
  const tenantId = MALAIKA_TENANT_ID;
  if (await prisma.product.count({ where: { tenantId } })) {
    console.log('catalog: el comercio ya tiene productos, no se cargan datos de ejemplo');
    return;
  }

  const products = load('products.json') as Array<Record<string, unknown>>;
  for (const [position, { inStock: _inStock, ...p }] of products.entries()) {
    await prisma.product.create({ data: { ...(p as never), tenantId, position } });
    await prisma.stockMovement.create({
      data: { tenantId, productId: p.id as string, type: 'ADJUST', quantity: p.stock as number },
    });
  }

  const presets = load('look-presets.json') as Array<Record<string, unknown>>;
  for (const [position, preset] of presets.entries()) {
    await prisma.lookPreset.create({ data: { ...(preset as never), tenantId, position } });
  }

  const zones = load('showroom-zones.json') as Array<{ hotspots: Array<Record<string, unknown>> } & Record<string, unknown>>;
  for (const [position, { hotspots, ...zone }] of zones.entries()) {
    await prisma.showroomZone.create({
      data: {
        ...(zone as never),
        tenantId,
        position,
        // El precio de cada hotspot sale del producto, no se guarda.
        hotspots: { create: hotspots.map(({ price: _price, ...h }) => h as never) },
      },
    });
  }
  console.log(`catalog: ${products.length} productos, ${presets.length} looks y ${zones.length} zonas cargados`);
}

await main().finally(() => prisma.$disconnect());
