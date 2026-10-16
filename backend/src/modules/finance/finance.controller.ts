import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { AuthUser } from "../../common/types/auth-user";
import { CancelFinanceTransactionDto, CreateFinanceTransactionDto } from "./finance.dto";
import { FinanceQueryDto, FinanceStatisticsQueryDto } from "./finance-query.dto";
import { FinanceService } from "./finance.service";

@Controller("finance")
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get("receipts")
  receipts(@Req() req: { user: AuthUser }, @Query() query: FinanceQueryDto) {
    return this.service.list("receipt", req.user, query);
  }
  @Post("receipts")
  createReceipt(@Body() dto: CreateFinanceTransactionDto, @Req() req: { user: AuthUser }) {
    return this.service.create("receipt", dto, req.user);
  }
  @Patch("receipts/:id/confirm")
  confirmReceipt(@Param("id") id: string, @Req() req: { user: AuthUser }) {
    return this.service.confirm("receipt", id, req.user);
  }
  @Patch("receipts/:id/cancel")
  cancelReceipt(@Param("id") id: string, @Body() dto: CancelFinanceTransactionDto, @Req() req: { user: AuthUser }) {
    return this.service.cancel("receipt", id, dto.reason, req.user);
  }
  @Get("receivable-orders")
  receivableOrders(@Req() req: { user: AuthUser }) {
    return this.service.orderOptions("receipt", req.user);
  }

  @Get("payments")
  payments(@Req() req: { user: AuthUser }, @Query() query: FinanceQueryDto) {
    return this.service.list("payment", req.user, query);
  }
  @Post("payments")
  createPayment(@Body() dto: CreateFinanceTransactionDto, @Req() req: { user: AuthUser }) {
    return this.service.create("payment", dto, req.user);
  }
  @Patch("payments/:id/confirm")
  confirmPayment(@Param("id") id: string, @Req() req: { user: AuthUser }) {
    return this.service.confirm("payment", id, req.user);
  }
  @Patch("payments/:id/cancel")
  cancelPayment(@Param("id") id: string, @Body() dto: CancelFinanceTransactionDto, @Req() req: { user: AuthUser }) {
    return this.service.cancel("payment", id, dto.reason, req.user);
  }
  @Get("payable-orders")
  payableOrders(@Req() req: { user: AuthUser }) {
    return this.service.orderOptions("payment", req.user);
  }

  @Get("statistics")
  statistics(@Req() req: { user: AuthUser }, @Query() query: FinanceStatisticsQueryDto) {
    return this.service.statistics(req.user, query);
  }
}
