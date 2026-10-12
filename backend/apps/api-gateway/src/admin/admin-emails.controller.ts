import { NOTIFICATIONS } from '@malaika/common';
import type { TenantContext } from '@malaika/common';
import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { Auth } from '../auth/auth.guard.js';
import { Broker } from '../core/broker.service.js';
import { EmailLogQuery, TestEmailDto } from '../dto/admin.dto.js';
import { CurrentTenant } from '../tenant/tenant.decorator.js';

const PREVIEW_TYPES = [
  'order-received-transfer',
  'order-paid',
  'order-shipped',
  'order-delivered',
  'order-cancelled',
  'order-expired',
  'admin-new-order',
  'welcome',
  'test',
];

@Controller('admin/emails')
@Auth('ADMIN')
export class AdminEmailsController {
  constructor(private readonly broker: Broker) {}

  /** Historial de emails enviados por el comercio, filtrable por pedido. */
  @Get()
  list(@CurrentTenant() t: TenantContext, @Query() q: EmailLogQuery) {
    return this.broker.send(NOTIFICATIONS.listEmails, {
      tenantId: t.id,
      orderId: q.orderId,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  /** Envía un email de prueba con el remitente y la marca configurados. */
  @Post('test')
  @HttpCode(200)
  sendTest(@CurrentTenant() t: TenantContext, @Body() dto: TestEmailDto) {
    return this.broker.send(NOTIFICATIONS.sendTest, { tenantId: t.id, to: dto.to });
  }

  /** Devuelve asunto, HTML y texto de una plantilla con datos de ejemplo. */
  @Get('preview/:type')
  preview(@CurrentTenant() t: TenantContext, @Param('type') type: string) {
    if (!PREVIEW_TYPES.includes(type)) throw new BadRequestException('Tipo de email desconocido');
    return this.broker.send(NOTIFICATIONS.preview, { tenantId: t.id, type });
  }
}
