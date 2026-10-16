import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { AuthUser } from "../../common/types/auth-user";
import {
  CreatePurchaseReceiptDto,
  PurchaseOrderDto,
  SupplierDto,
} from "./purchase.dto";
import { PurchaseQueryDto } from "./purchase-query.dto";
import { PurchaseService } from "./purchase.service";

@Controller("purchase")
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}
  @Get("suppliers") suppliers(
    @Req() req: { user: AuthUser },
    @Query() query: PurchaseQueryDto,
  ) {
    return this.service.listSuppliers(req.user, query);
  }
  @Get("supplier-options") supplierOptions(@Req() req: { user: AuthUser }) {
    return this.service.supplierOptions(req.user);
  }
  @Post("suppliers") createSupplier(
    @Body() dto: SupplierDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.createSupplier(dto, req.user);
  }
  @Put("suppliers/:id") updateSupplier(
    @Param("id") id: string,
    @Body() dto: SupplierDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.updateSupplier(id, dto, req.user);
  }
  @Delete("suppliers/:id") removeSupplier(
    @Param("id") id: string,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.removeSupplier(id, req.user);
  }
  @Get("orders") orders(
    @Req() req: { user: AuthUser },
    @Query() query: PurchaseQueryDto,
  ) {
    return this.service.listOrders(req.user, query);
  }
  @Post("orders") createOrder(
    @Body() dto: PurchaseOrderDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.createOrder(dto, req.user);
  }
  @Put("orders/:id") updateOrder(
    @Param("id") id: string,
    @Body() dto: PurchaseOrderDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.updateOrder(id, dto, req.user);
  }
  @Patch("orders/:id/confirm") confirmOrder(
    @Param("id") id: string,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.confirmOrder(id, req.user);
  }
  @Patch("orders/:id/cancel") cancelOrder(
    @Param("id") id: string,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.cancelOrder(id, req.user);
  }
  @Delete("orders/:id") removeOrder(
    @Param("id") id: string,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.removeOrder(id, req.user);
  }
  @Get("receipts") receipts(
    @Req() req: { user: AuthUser },
    @Query() query: PurchaseQueryDto,
  ) {
    return this.service.listReceipts(req.user, query);
  }
  @Post("receipts") createReceipt(
    @Body() dto: CreatePurchaseReceiptDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.service.createReceipt(dto, req.user);
  }
}
