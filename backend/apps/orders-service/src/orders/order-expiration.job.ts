import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrderExpirationJob {
  private readonly logger = new Logger(OrderExpirationJob.name);
  private running = false;

  constructor(private readonly orders: OrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.orders.expirePending();
      if (count) this.logger.log(`${count} pedido(s) vencidos sin pago: stock liberado`);
    } catch (err) {
      this.logger.error(`Error al vencer pedidos: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
