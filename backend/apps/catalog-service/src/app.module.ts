import { MessagingModule } from '@malaika/common';
import { Module } from '@nestjs/common';
import { CacheService } from './cache/cache.service.js';
import { LooksController } from './looks/looks.controller.js';
import { LooksService } from './looks/looks.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { ProductsController } from './products/products.controller.js';
import { ProductsService } from './products/products.service.js';
import { StockController } from './stock/stock.controller.js';
import { StockService } from './stock/stock.service.js';

@Module({
  imports: [MessagingModule.register()],
  controllers: [ProductsController, StockController, LooksController],
  providers: [PrismaService, CacheService, ProductsService, StockService, LooksService],
})
export class AppModule {}
