import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  InventoryBalance,
  InventoryLedgerEntry,
  Warehouse,
} from "../inventory/inventory.entity";
import { Product } from "../product/product.entity";
import { AppConfig } from "../workspace/app-config.entity";
import { PurchaseController } from "./purchase.controller";
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseReceipt,
  PurchaseReceiptLine,
  Supplier,
} from "./purchase.entity";
import { PurchaseService } from "./purchase.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Supplier,
      PurchaseOrder,
      PurchaseOrderLine,
      PurchaseReceipt,
      PurchaseReceiptLine,
      Warehouse,
      Product,
      InventoryBalance,
      InventoryLedgerEntry,
      AppConfig,
    ]),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
