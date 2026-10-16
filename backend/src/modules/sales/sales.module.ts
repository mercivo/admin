import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customer/customer.entity';
import { InventoryBalance, InventoryLedgerEntry, Warehouse } from '../inventory/inventory.entity';
import { Product } from '../product/product.entity';
import { SalesController } from './sales.controller';
import { SalesOrder, SalesOrderLine, SalesShipment, SalesShipmentLine } from './sales.entity';
import { SalesService } from './sales.service';
import { AppConfig } from '../workspace/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, SalesOrderLine, SalesShipment, SalesShipmentLine, Customer, Warehouse, Product, InventoryBalance, InventoryLedgerEntry, AppConfig])],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
