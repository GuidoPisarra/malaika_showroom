# Malaika Showroom

Tienda online de moda con maniquí interactivo para armar looks, catálogo con filtros, showroom AR y checkout con Mercado Pago.

El repo tiene dos partes:

| Carpeta | Qué es |
| --- | --- |
| `src/` | Front en Angular 21 con SSR: la tienda y el panel de administración (`/admin`). |
| `backend/` | API multi-comercio en NestJS con microservicios, PostgreSQL (Prisma), RabbitMQ y Redis. Ver [backend/README.md](backend/README.md). |

## Correr todo en local

1. Levantá el backend (ver [backend/README.md](backend/README.md#desarrollo-local)):

   ```bash
   cd backend
   cp .env.example .env
   docker compose up -d postgres redis rabbitmq
   npm install && npm run prisma:deploy && npm run seed
   npm run dev
   ```

2. En otra terminal, el front:

   ```bash
   npm install
   npm start          # http://localhost:4200
   ```

   `ng serve` reenvía `/api` al backend con `proxy.conf.json`.

- Tienda: http://localhost:4200
- Panel del comercio: http://localhost:4200/admin (usuario y contraseña de `MALAIKA_ADMIN_*` en `backend/.env`)

Para probar compras sin credenciales de Mercado Pago, poné `PAYMENTS_SIMULATION=true` en `backend/.env`: los pagos se aprueban solos.

## Producción

El front se compila con `npm run build` y se sirve con `npm run serve:ssr:app` (puerto 4000). En el servidor, la variable `API_URL` le indica al SSR dónde está el gateway (por defecto `http://localhost:3100/api`). El backend se despliega con `docker compose` y un nginx delante; el ejemplo está en `backend/deploy/nginx.conf`.
