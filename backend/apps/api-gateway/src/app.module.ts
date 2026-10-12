import { MessagingModule } from '@malaika/common';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountController } from './account/account.controller.js';
import { AdminCatalogController } from './admin/admin-catalog.controller.js';
import { AdminSalesController } from './admin/admin-sales.controller.js';
import { AdminEmailsController } from './admin/admin-emails.controller.js';
import { AdminStoreController } from './admin/admin-store.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { StorefrontController } from './catalog/storefront.controller.js';
import { Broker } from './core/broker.service.js';
import { RedisService } from './core/redis.service.js';
import { HealthController } from './health.controller.js';
import { StorageService } from './media/storage.service.js';
import { UploadsController } from './media/uploads.controller.js';
import { OrdersController } from './orders/orders.controller.js';
import { PlatformController } from './platform/platform.controller.js';
import { TenantResolver } from './tenant/tenant-resolver.service.js';
import { TenantMiddleware } from './tenant/tenant.middleware.js';
import { WebhooksController } from './webhooks/webhooks.controller.js';

@Module({
  imports: [
    MessagingModule.register(),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
  ],
  controllers: [
    HealthController,
    StorefrontController,
    OrdersController,
    AuthController,
    AccountController,
    AdminCatalogController,
    AdminSalesController,
    AdminStoreController,
    AdminEmailsController,
    PlatformController,
    WebhooksController,
    UploadsController,
  ],
  providers: [Broker, RedisService, StorageService, TenantResolver, AuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Todo lo que opera sobre un comercio pasa por el resolvedor de tenant,
    // salvo la administración de la plataforma, los webhooks y el health check.
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'platform/{*path}', method: RequestMethod.ALL },
        { path: 'webhooks/{*path}', method: RequestMethod.ALL },
        { path: 'uploads/{*path}', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
