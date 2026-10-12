# Imagen única para todos los servicios: se elige cuál corre con SERVICE.
#   docker build --build-arg SERVICE=api-gateway -t malaika/api-gateway .

FROM node:22-alpine AS build
WORKDIR /app
# npm 11 respeta "allowScripts" del package.json (scripts de prisma y esbuild).
RUN npm install -g npm@11
COPY package.json package-lock.json tsconfig.base.json ./
COPY libs/common/package.json libs/common/
COPY apps/api-gateway/package.json apps/api-gateway/
COPY apps/identity-service/package.json apps/identity-service/
COPY apps/catalog-service/package.json apps/catalog-service/
COPY apps/orders-service/package.json apps/orders-service/
COPY apps/payments-service/package.json apps/payments-service/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
ARG SERVICE
ENV SERVICE=${SERVICE}
USER node
# Los servicios con base de datos aplican sus migraciones antes de arrancar.
CMD ["sh", "-c", "cd apps/$SERVICE && if [ -d prisma ]; then npx prisma migrate deploy; fi && exec node --enable-source-maps dist/main.js"]
