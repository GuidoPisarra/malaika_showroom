# Backend de Malaika (multi-comercio)

API para la tienda Malaika Showroom y cualquier otro comercio que se sume a la plataforma.
Cada comercio tiene su propio catálogo, stock, cupones, pedidos, clientas, admins y credenciales de Mercado Pago.

## Arquitectura

```
                 ┌──────────────────────────┐
  Front(s) ────▶ │ api-gateway  (HTTP :3100)│  REST + JWT + rate limit
                 │  resuelve el comercio    │  por dominio (Host)
                 └────────────┬─────────────┘
                              │ RabbitMQ (exchange "malaika", tipo topic)
     ┌──────────────┬─────────┴────────┬──────────────────┬───────────────┐
     ▼              ▼                  ▼                  ▼               ▼
 identity       catalog             orders            payments       notifications
 comercios      productos, stock,   cupones,          Mercado Pago   emails (Resend
 usuarios, JWT  looks, showroom     pedidos           Checkout Pro   o SMTP)
     │              │  ▲ Redis          │                  │               │
     ▼              ▼                   ▼                  ▼               ▼
  PostgreSQL: una base por servicio (malaika_identity, _catalog, _orders, _payments, _notifications)
```

- **NestJS 12** (ESM) con microservicios sobre **RabbitMQ**. Cada servicio enlaza su cola al exchange con los patrones que atiende, así que el gateway publica sin saber quién responde.
- **Prisma 7 + PostgreSQL**: cada servicio es dueño de su base y de sus migraciones (`apps/*/prisma`).
- **Redis**: caché del catálogo y de la resolución de comercios.
- **Eventos de dominio** (`libs/common/src/patterns.ts`):
  - `events.order.paid` / `events.order.cancelled`: catalog confirma o libera el stock reservado.
  - `events.payment.status-changed`: orders marca el pedido como pagado.
  - `events.order.created`, `events.order.status-changed`, `events.user.registered`: notifications manda los emails.

### Multi-comercio

- Todas las tablas de negocio tienen `tenantId` y todas las consultas filtran por él.
- El gateway identifica el comercio por el dominio (`Host` / `X-Forwarded-Host`), que se configura en `Tenant.domains`. También acepta el header `X-Tenant: <slug>`. En desarrollo, si el dominio no coincide, usa `DEFAULT_TENANT_SLUG`.
- Un JWT de admin o clienta solo sirve en su propio comercio. El superadmin de la plataforma da de alta comercios en `/api/platform`.

### Flujo de compra

1. `POST /api/orders`: el servidor recalcula precios desde el catálogo (nunca confía en el navegador), aplica cupón, descuento por cantidad, envío y descuento por transferencia según la configuración del comercio.
2. Reserva el stock de forma atómica. Si algo no alcanza, responde 409 y no se crea el pedido.
3. Mercado Pago: crea una preferencia de **Checkout Pro** con las credenciales del comercio y devuelve `checkoutUrl`. La clienta paga en Mercado Pago y vuelve a `storefrontUrl/?order=MLK-123456&payment=success`.
4. Mercado Pago avisa por webhook (`/api/webhooks/mercadopago/:slug`). El servicio valida la firma, consulta el pago a Mercado Pago y, si está aprobado, el pedido pasa a `PAID`.
5. Transferencia: el pedido queda `PENDING_PAYMENT` con los datos bancarios del comercio y el admin lo marca como pagado.
6. Los pedidos sin pagar vencen (`ORDER_TTL_HOURS_*`) y liberan su stock automáticamente.

### Stock

Cada producto controla su stock de una de dos formas, y el admin elige cuál desde el panel:

- **General**: un solo número para el producto (`PUT /admin/products/:id/stock` con `{ stock }`). Sirve para accesorios o prendas de talle único.
- **Por talle y color**: un número por cada combinación (`{ variants: [{ size, color, stock }] }`). El stock del producto pasa a ser la suma. Si el producto no tiene talles o colores, ese campo va vacío.

Cada cambio queda registrado en `StockMovement`. Si el admin quita un talle o un color del producto, sus variantes se borran y el stock se recalcula.

### Envíos por zona

En la configuración del comercio (`shippingZones`) se cargan zonas con su costo, su mínimo para envío gratis y un plazo de entrega. Una dirección cae en una zona por código postal (`"1425"` o rangos `"1000-1499"`; se acepta el CPA `C1425ABC`) o, si ninguna la toma por código postal, por provincia. Fuera de las zonas se cobra `shippingFee`, o se rechaza el pedido si `shipsOutsideZones` es `false`.

`GET /api/shipping/quote?postalCode=&province=` devuelve el costo para mostrarlo en el checkout. El pedido se cotiza de nuevo en el servidor.

### Imágenes

El panel sube las fotos a `POST /api/admin/uploads?folder=products|looks|showroom|brand` (campo `file`). El gateway valida que sea una imagen por su contenido, la endereza, la achica (2000 px de lado, 4096 en el showroom), la pasa a WebP y descarta los metadatos, incluida la ubicación GPS de las fotos del celular. Devuelve la URL pública.

- `STORAGE_DRIVER=s3` (recomendado en producción): AWS S3, Cloudflare R2, DigitalOcean Spaces o MinIO. Completá `S3_*` y que `S3_PUBLIC_URL` apunte al dominio público del bucket o de la CDN.
- `STORAGE_DRIVER=local`: se guardan en `UPLOADS_DIR` y el gateway las sirve en `/api/uploads`. En `docker-compose.yml` es el volumen `uploads`, que conviene incluir en los backups.

### Emails

`notifications-service` escucha los eventos y manda:

| Cuándo | A quién |
| --- | --- |
| Pedido por transferencia creado (con los datos bancarios y el plazo) | Clienta y comercio |
| Pago confirmado | Clienta y comercio |
| Pedido enviado (con el número de seguimiento) y entregado | Clienta |
| Pedido cancelado por el comercio o vencido sin pago | Clienta |
| Cuenta creada | Clienta |

Cada email se guarda antes de mandarse (`EmailLog`), con una clave por pedido y tipo para no mandarlo dos veces si un evento llega repetido. Los que fallan se reintentan cada 10 minutos, hasta 5 veces en dos días. El link "Ver mi pedido" abre el seguimiento en la tienda (`/?pedido=...&email=...`).

Cada comercio configura desde el panel el nombre del remitente, la dirección para respuestas, el logo, el color, quién recibe los avisos de pedidos nuevos (si no carga a nadie, va al email de contacto) y si se mandan o no los emails a las clientas.

Proveedor (`EMAIL_DRIVER`):

- `resend` (recomendado): creá una cuenta en [resend.com](https://resend.com), verificá el dominio desde el que vas a mandar (registros DNS SPF y DKIM) y completá `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo `"Tienda" <no-reply@tudominio.com>`).
- `smtp`: cualquier servidor SMTP con `SMTP_URL`.
- `log`: no manda nada, anota cada email en el log y guarda el HTML en `EMAIL_OUTBOX_DIR`. Es lo que se usa si no hay ni `RESEND_API_KEY` ni `SMTP_URL`.

Por defecto los emails salen desde la dirección de `EMAIL_FROM` con el nombre del comercio. Si un comercio quiere su propia dirección (`ventas@sutienda.com`), su dominio tiene que estar verificado en Resend y figurar entre los dominios del comercio; si no, se usa la dirección de la plataforma.

## Desarrollo local

Requisitos: Node 22+, npm 11 (`npm i -g npm@11`) y Docker (o PostgreSQL, Redis y RabbitMQ instalados).

```bash
cd backend
cp .env.example .env              # para probar sin Mercado Pago: PAYMENTS_SIMULATION=true
docker compose up -d postgres redis rabbitmq
npm install
npm run prisma:deploy             # crea las tablas
npm run seed                      # superadmin, comercio "malaika", catálogo y cupones del front
npm run dev                       # levanta los 5 servicios con recarga automática
```

La API queda en http://localhost:3100/api. El front en desarrollo la usa mediante el proxy de `ng serve` (`proxy.conf.json` en la raíz del repo).

Comandos útiles:

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila todos los servicios |
| `npm test` | Tests unitarios (Vitest) |
| `npm run typecheck` | Chequeo de tipos |
| `npm run prisma:migrate -w @malaika/catalog-service -- --name <cambio>` | Nueva migración de un servicio |

## Producción en un VPS

```bash
cd backend
cp .env.example .env    # completá JWT_SECRET, ENCRYPTION_KEY, contraseñas y PUBLIC_API_URL (https)
docker compose up -d --build
docker compose run --rm seed     # solo la primera vez
```

`deploy/nginx.conf` es un ejemplo de proxy: `/api` va al gateway y el resto al front SSR. Mercado Pago solo envía webhooks a URLs **https**, así que `PUBLIC_API_URL` tiene que ser el dominio público con certificado.

Para cobrar, cada comercio carga sus credenciales desde el panel (`PUT /api/admin/payment-settings`): el access token de producción (`APP_USR-...`) y la clave secreta de webhooks. Se guardan cifradas con `ENCRYPTION_KEY`.

## Endpoints

Todas las rutas llevan el prefijo `/api`. 🔓 pública · 👤 clienta logueada · 🛠️ admin del comercio · 👑 superadmin.

**Tienda**

| Método | Ruta | |
| --- | --- | --- |
| GET | `/store` | 🔓 Nombre y reglas del comercio (envío, descuentos, datos de transferencia) |
| GET | `/products` | 🔓 Catálogo. Filtros: `search, category, occasion, sizes, colors, minPrice, maxPrice, onlyInStock, sortBy` |
| GET | `/products/featured`, `/products/:id` | 🔓 |
| GET | `/look-presets`, `/showroom-zones` | 🔓 Looks armados y zonas del showroom AR |
| GET | `/shipping/quote?postalCode=&province=` | 🔓 Costo y plazo de envío según la zona |
| POST | `/coupons/validate` | 🔓 `{ code, subtotal? }` |
| POST | `/orders` | 🔓/👤 Crea el pedido. Devuelve `order`, `checkoutUrl` (Mercado Pago) o `bankTransfer` |
| GET | `/orders/track/:orderNumber?email=` | 🔓 Seguimiento para invitadas |

**Cuentas**

| Método | Ruta | |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | 🔓 Devuelven `accessToken` (15 min) y `refreshToken` (30 días) |
| POST | `/auth/refresh`, `/auth/logout` | 🔓 `{ refreshToken }` (se rota en cada uso) |
| GET | `/auth/me` | 👤 |
| GET | `/me/orders` | 👤 Historial de pedidos |
| GET, POST, DELETE | `/me/looks` | 👤 Looks guardados |

**Panel del comercio** (`/admin`, 🛠️)

| Método | Ruta | |
| --- | --- | --- |
| GET | `/admin/dashboard` | Ventas de las últimas 24 h y 30 días, pedidos por estado |
| GET, POST, PATCH, DELETE | `/admin/products[/:id]` | ABM de productos (la baja es lógica) |
| PUT | `/admin/products/:id/stock` | `{ stock }` o `{ variants: [{ size, color, stock }] }`, con registro de movimiento |
| POST | `/admin/uploads?folder=` | Sube una imagen (multipart, campo `file`) y devuelve `{ url, width, height }` |
| GET, POST, PUT, DELETE | `/admin/look-presets[/:id]`, `/admin/showroom-zones[/:id]` | Looks y showroom |
| GET, POST, PATCH, DELETE | `/admin/coupons[/:id]` | Cupones con vigencia, mínimo de compra y límite de usos |
| GET | `/admin/orders`, `/admin/orders/:id` | Filtros: `status, search, page, pageSize` |
| PATCH | `/admin/orders/:id/status` | `PAID`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED` (+ `trackingNumber`) |
| GET, PATCH | `/admin/settings` | Reglas del comercio, incluidas las zonas de envío y los emails |
| GET, PUT | `/admin/payment-settings` | Credenciales de Mercado Pago |
| GET | `/admin/emails?orderId=&page=` | Emails enviados, con su estado |
| GET | `/admin/emails/preview/:type` | Vista previa de una plantilla con datos de ejemplo |
| POST | `/admin/emails/test` | `{ to }` Manda un email de prueba con la configuración actual |
| GET, POST | `/admin/users` | Clientas y admins |

**Plataforma** (👑)

| Método | Ruta | |
| --- | --- | --- |
| POST | `/platform/auth/login` | 🔓 Login del superadmin |
| GET, POST, PATCH | `/platform/tenants[/:id]` | Alta de comercios (con su primer admin), dominios y activación |

Los errores siempre tienen la forma `{ statusCode, message, code? }`, con mensajes en castellano listos para mostrar.
