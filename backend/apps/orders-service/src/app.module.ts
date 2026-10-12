import { MessagingModule } from '@malaika/common';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CouponsController } from './coupons/coupons.controller.js';
import { CouponsService } from './coupons/coupons.service.js';
import { OrderExpirationJob } from './orders/order-expiration.job.js';
import { OrdersController } from './orders/orders.controller.js';
import { OrdersService } from './orders/orders.service.js';
import { PrismaService } from './prisma/prisma.service.js';

@Module({
  imports: [MessagingModule.register(), ScheduleModule.forRoot()],
  controllers: [CouponsController, OrdersController],
  providers: [PrismaService, CouponsService, OrdersService, OrderExpirationJob],
})
export class AppModule {}
