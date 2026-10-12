import { ORDERS } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CouponsService } from './coupons.service.js';
import type { CouponInput } from './coupons.service.js';

@Controller()
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @MessagePattern(ORDERS.validateCoupon)
  validate(@Payload() data: { tenantId: string; code: string; subtotal?: number }) {
    return this.coupons.validate(data.tenantId, data.code, data.subtotal);
  }

  @MessagePattern(ORDERS.listCoupons)
  list(@Payload() data: { tenantId: string }) {
    return this.coupons.list(data.tenantId);
  }

  @MessagePattern(ORDERS.upsertCoupon)
  upsert(@Payload() data: { tenantId: string; coupon: Partial<CouponInput> }) {
    return this.coupons.upsert(data.tenantId, data.coupon);
  }

  @MessagePattern(ORDERS.deleteCoupon)
  remove(@Payload() data: { tenantId: string; id: string }) {
    return this.coupons.remove(data.tenantId, data.id);
  }
}
