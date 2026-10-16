import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Tenant } from '../site/tenant.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { ProductStorageService } from './product-storage.service';
import { InventoryBalance, InventoryLedgerEntry, Warehouse } from '../inventory/inventory.entity';
import { AppConfig } from '../workspace/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Tenant, ProductCategory, Warehouse, InventoryBalance, InventoryLedgerEntry, AppConfig])],
  controllers: [ProductController],
  providers: [ProductService, ProductStorageService],
  exports: [ProductService],
})
export class ProductModule {}
