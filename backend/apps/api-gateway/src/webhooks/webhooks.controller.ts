import { PAYMENTS } from '@malaika/common';
import { Body, Controller, Headers, HttpCode, Logger, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Broker } from '../core/broker.service.js';
import { TenantResolver } from '../tenant/tenant-resolver.service.js';

/** Notificaciones de Mercado Pago. Cada comercio tiene su URL: /api/webhooks/mercadopago/:slug */
@Controller('webhooks')
@SkipThrottle()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly broker: Broker,
    private readonly tenants: TenantResolver,
  ) {}

  @Post('mercadopago/:slug')
  @HttpCode(200)
  async mercadoPago(
    @Param('slug') slug: string,
    @Query() query: Record<string, string>,
    @Body() body: unknown,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const tenant = await this.tenants.bySlug(slug);
    if (!tenant) throw new NotFoundException();
    return this.broker.send(PAYMENTS.mercadoPagoWebhook, {
      tenantId: tenant.id,
      query,
      body: body ?? null,
      signature,
      requestId,
    });
  }
}
