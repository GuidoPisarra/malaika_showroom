import { EVENTS, ORDERS } from '@malaika/common';
import type { PaymentStatusChangedEvent } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import type { CreateOrderInput, OrderStatus } from './order.types.js';
import { OrdersService } from './orders.service.js';

@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @MessagePattern(ORDERS.createOrder)
  create(@Payload() data: CreateOrderInput) {
    return this.orders.create(data);
  }

  @MessagePattern(ORDERS.trackOrder)
  track(@Payload() data: { tenantId: string; orderNumber: string; email: string }) {
    return this.orders.track(data.tenantId, data.orderNumber, data.email);
  }

  @MessagePattern(ORDERS.listMyOrders)
  mine(@Payload() data: { tenantId: string; userId: string }) {
    return this.orders.listMine(data.tenantId, data.userId);
  }

  @MessagePattern(ORDERS.adminListOrders)
  adminList(@Payload() data: { tenantId: string; status?: OrderStatus; search?: string; page?: number; pageSize?: number }) {
    return this.orders.adminList(data);
  }

  @MessagePattern(ORDERS.adminGetOrder)
  adminGet(@Payload() data: { tenantId: string; id: string }) {
    return this.orders.adminGet(data.tenantId, data.id);
  }

  @MessagePattern(ORDERS.updateStatus)
  updateStatus(
    @Payload() data: { tenantId: string; id: string; status: OrderStatus; trackingNumber?: string; adminNotes?: string },
  ) {
    return this.orders.updateStatus(data);
  }

  @MessagePattern(ORDERS.dashboard)
  dashboard(@Payload() data: { tenantId: string }) {
    return this.orders.dashboard(data.tenantId);
  }

  @EventPattern(EVENTS.paymentStatusChanged)
  onPaymentStatusChanged(@Payload() data: PaymentStatusChangedEvent) {
    return this.orders.onPaymentStatusChanged(data);
  }
}
