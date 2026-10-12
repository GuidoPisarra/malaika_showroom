import { CATALOG, EVENTS } from '@malaika/common';
import type { OrderEvent } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { StockService } from './stock.service.js';
import type { StockLine } from './stock.service.js';

@Controller()
export class StockController {
  constructor(private readonly stock: StockService) {}

  @MessagePattern(CATALOG.reserveStock)
  reserve(@Payload() data: { tenantId: string; orderId: string; items: StockLine[] }) {
    return this.stock.reserve(data);
  }

  @EventPattern(EVENTS.orderCancelled)
  onOrderCancelled(@Payload() data: OrderEvent) {
    return this.stock.release(data);
  }

  @EventPattern(EVENTS.orderPaid)
  onOrderPaid(@Payload() data: OrderEvent) {
    return this.stock.confirm(data);
  }
}
