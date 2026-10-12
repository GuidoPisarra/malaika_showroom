import { EVENTS, NOTIFICATIONS } from '@malaika/common';
import type { OrderCancelledEvent, OrderEvent, OrderStatusChangedEvent, UserRegisteredEvent } from '@malaika/common';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { EmailLogService } from './email/email-log.service.js';
import { NotificationsService } from './email/notifications.service.js';
import type { EmailType } from './templates/emails.js';

@Controller()
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly emails: EmailLogService,
  ) {}

  @EventPattern(EVENTS.orderCreated)
  onOrderCreated(@Payload() event: OrderEvent) {
    return this.safely('pedido creado', () => this.notifications.onOrderCreated(event));
  }

  @EventPattern(EVENTS.orderPaid)
  onOrderPaid(@Payload() event: OrderEvent) {
    return this.safely('pedido pagado', () => this.notifications.onOrderPaid(event));
  }

  @EventPattern(EVENTS.orderStatusChanged)
  onOrderStatusChanged(@Payload() event: OrderStatusChangedEvent) {
    return this.safely('cambio de estado', () => this.notifications.onOrderStatusChanged(event));
  }

  @EventPattern(EVENTS.orderCancelled)
  onOrderCancelled(@Payload() event: OrderCancelledEvent) {
    return this.safely('pedido cancelado', () => this.notifications.onOrderCancelled(event));
  }

  @EventPattern(EVENTS.userRegistered)
  onUserRegistered(@Payload() event: UserRegisteredEvent) {
    return this.safely('cuenta nueva', () => this.notifications.onUserRegistered(event));
  }

  @MessagePattern(NOTIFICATIONS.listEmails)
  list(@Payload() data: { tenantId: string; orderId?: string; page?: number; pageSize?: number }) {
    return this.emails.list(data);
  }

  @MessagePattern(NOTIFICATIONS.sendTest)
  sendTest(@Payload() data: { tenantId: string; to: string }) {
    return this.notifications.sendTest(data);
  }

  @MessagePattern(NOTIFICATIONS.preview)
  preview(@Payload() data: { tenantId: string; type: EmailType }) {
    return this.notifications.preview(data);
  }

  /** Un email que no sale nunca debe frenar la cola de eventos. */
  private async safely(what: string, run: () => Promise<void>): Promise<void> {
    try {
      await run();
    } catch (err) {
      this.logger.error(`Error al procesar el email de ${what}: ${(err as Error).message}`);
    }
  }
}
