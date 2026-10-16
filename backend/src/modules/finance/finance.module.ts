import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Customer } from "../customer/customer.entity";
import { Supplier, PurchaseOrder } from "../purchase/purchase.entity";
import { SalesOrder } from "../sales/sales.entity";
import { FinanceController } from "./finance.controller";
import { FinanceTransaction } from "./finance.entity";
import { FinanceService } from "./finance.service";

@Module({
  imports: [TypeOrmModule.forFeature([FinanceTransaction, SalesOrder, PurchaseOrder, Customer, Supplier])],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
