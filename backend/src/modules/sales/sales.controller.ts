import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { CreateShipmentDto, SalesOrderDto } from './sales.dto';
import { SalesService } from './sales.service';
import { SalesQueryDto } from './sales-query.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}
  @Get('orders') orders(@Req() req: { user: AuthUser }, @Query() query: SalesQueryDto) { return this.service.listOrders(req.user, query); }
  @Get('orders/:id') order(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.getOrder(id, req.user); }
  @Post('orders') createOrder(@Body() dto: SalesOrderDto, @Req() req: { user: AuthUser }) { return this.service.createOrder(dto, req.user); }
  @Put('orders/:id') updateOrder(@Param('id') id: string, @Body() dto: SalesOrderDto, @Req() req: { user: AuthUser }) { return this.service.updateOrder(id, dto, req.user); }
  @Patch('orders/:id/confirm') confirmOrder(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.confirmOrder(id, req.user); }
  @Patch('orders/:id/cancel') cancelOrder(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.cancelOrder(id, req.user); }
  @Delete('orders/:id') removeOrder(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeOrder(id, req.user); }
  @Get('shipments') shipments(@Req() req: { user: AuthUser }, @Query() query: SalesQueryDto) { return this.service.listShipments(req.user, query); }
  @Post('shipments') createShipment(@Body() dto: CreateShipmentDto, @Req() req: { user: AuthUser }) { return this.service.createShipment(dto, req.user); }
}
