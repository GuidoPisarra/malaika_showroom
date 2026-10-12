import { MessagingModule } from '@malaika/common';
import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout/checkout.service.js';
import { MercadoPagoClient } from './mercadopago/mercadopago.client.js';
import { PaymentsController } from './payments.controller.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PaymentSettingsService } from './settings/payment-settings.service.js';
import { WebhooksService } from './webhooks/webhooks.service.js';

@Module({
  imports: [MessagingModule.register()],
  controllers: [PaymentsController],
  providers: [PrismaService, PaymentSettingsService, MercadoPagoClient, CheckoutService, WebhooksService],
})
export class AppModule {}
