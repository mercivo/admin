import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { InventoryController } from './inventory.controller';
import { InventoryBalance, InventoryLedgerEntry, StockCount, StockCountLine, StockTransfer, StockTransferLine, Warehouse } from './inventory.entity';
import { InventoryService } from './inventory.service';
import { Tenant } from '../site/tenant.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { PurchaseReceipt } from '../purchase/purchase.entity';
import { SalesShipment } from '../sales/sales.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, InventoryBalance, InventoryLedgerEntry, StockCount, StockCountLine, StockTransfer, StockTransferLine, PurchaseReceipt, SalesShipment, Product, Tenant, AppConfig])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
