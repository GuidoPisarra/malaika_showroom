import { PAYMENTS } from '@malaika/common';
import type { TenantContext } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CheckoutService } from './checkout/checkout.service.js';
import type { CheckoutOrder } from './checkout/checkout.service.js';
import { PaymentSettingsService } from './settings/payment-settings.service.js';
import type { PaymentSettingsInput } from './settings/payment-settings.service.js';
import { WebhooksService } from './webhooks/webhooks.service.js';
import type { MercadoPagoWebhookInput } from './webhooks/webhooks.service.js';

@Controller()
export class PaymentsController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly webhooks: WebhooksService,
    private readonly settings: PaymentSettingsService,
  ) {}

  @MessagePattern(PAYMENTS.createCheckout)
  createCheckout(@Payload() data: { tenant: TenantContext; order: CheckoutOrder }) {
    return this.checkout.create(data);
  }

  @MessagePattern(PAYMENTS.mercadoPagoWebhook)
  mercadoPagoWebhook(@Payload() data: MercadoPagoWebhookInput) {
    return this.webhooks.handleMercadoPago(data);
  }

  @MessagePattern(PAYMENTS.getSettings)
  getSettings(@Payload() data: { tenantId: string }) {
    return this.settings.get(data.tenantId);
  }

  @MessagePattern(PAYMENTS.updateSettings)
  updateSettings(@Payload() data: { tenantId: string; settings: PaymentSettingsInput }) {
    return this.settings.update(data.tenantId, data.settings);
  }
}
