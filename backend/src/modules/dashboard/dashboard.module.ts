import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { SalesOrder } from '../sales/sales.entity';
import { PurchaseOrder } from '../purchase/purchase.entity';
import { FinanceTransaction } from '../finance/finance.entity';
import { InventoryBalance } from '../inventory/inventory.entity';
import { Site } from '../site/site.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { Warehouse } from '../inventory/inventory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory, Customer, AppConfig, SalesOrder, PurchaseOrder, FinanceTransaction, InventoryBalance, Warehouse, Site])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
