import { CATALOG } from '@malaika/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { ProductFilter, ProductInput } from './product.types.js';
import { ProductsService } from './products.service.js';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @MessagePattern(CATALOG.listProducts)
  list(@Payload() data: { tenantId: string; filter?: ProductFilter }) {
    return this.products.list(data.tenantId, data.filter);
  }

  @MessagePattern(CATALOG.featuredProducts)
  featured(@Payload() data: { tenantId: string }) {
    return this.products.featured(data.tenantId);
  }

  @MessagePattern(CATALOG.getProduct)
  get(@Payload() data: { tenantId: string; id: string }) {
    return this.products.get(data.tenantId, data.id);
  }

  @MessagePattern(CATALOG.productsByIds)
  byIds(@Payload() data: { tenantId: string; ids: string[] }) {
    return this.products.byIds(data.tenantId, data.ids);
  }

  @MessagePattern(CATALOG.adminListProducts)
  adminList(@Payload() data: { tenantId: string; search?: string; page?: number; pageSize?: number }) {
    return this.products.adminList(data);
  }

  @MessagePattern(CATALOG.createProduct)
  create(@Payload() data: { tenantId: string; product: ProductInput }) {
    return this.products.create(data.tenantId, data.product);
  }

  @MessagePattern(CATALOG.updateProduct)
  update(@Payload() data: { tenantId: string; id: string; product: Partial<ProductInput> }) {
    return this.products.update(data.tenantId, data.id, data.product);
  }

  @MessagePattern(CATALOG.deleteProduct)
  remove(@Payload() data: { tenantId: string; id: string }) {
    return this.products.remove(data.tenantId, data.id);
  }

  @MessagePattern(CATALOG.setStock)
  setStock(@Payload() data: { tenantId: string; id: string; stock: number }) {
    return this.products.setStock(data.tenantId, data.id, data.stock);
  }
}
