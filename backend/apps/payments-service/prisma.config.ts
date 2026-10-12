import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env', quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Vacía alcanza para `prisma generate` (por ejemplo, al construir la imagen Docker).
  datasource: { url: process.env.PAYMENTS_DATABASE_URL ?? '' },
});
