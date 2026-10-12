import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { CreateCountDto, CreateTransferDto, UpdateCountDto, WarehouseDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Get('stocks') stocks(@Req() req: { user: AuthUser }, @Query() query: Record<string, string | undefined>) { return this.service.listStocks(req.user, query); }
  @Get('ledger') ledger(@Req() req: { user: AuthUser }, @Query() query: Record<string, string | undefined>) { return this.service.listLedger(req.user, query); }

  @Get('warehouses') warehouses(@Req() req: { user: AuthUser }) { return this.service.listWarehouses(req.user); }
  @Post('warehouses') createWarehouse(@Body() dto: WarehouseDto, @Req() req: { user: AuthUser }) { return this.service.createWarehouse(dto, req.user); }
  @Put('warehouses/:id') updateWarehouse(@Param('id') id: string, @Body() dto: WarehouseDto, @Req() req: { user: AuthUser }) { return this.service.updateWarehouse(id, dto, req.user); }
  @Patch('warehouses/:id/default') setDefaultWarehouse(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.setDefaultWarehouse(id, req.user); }
  @Delete('warehouses/:id') removeWarehouse(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeWarehouse(id, req.user); }

  @Get('counts') counts(@Req() req: { user: AuthUser }) { return this.service.listCounts(req.user); }
  @Get('counts/:id') count(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.getCount(id, req.user); }
  @Post('counts') createCount(@Body() dto: CreateCountDto, @Req() req: { user: AuthUser }) { return this.service.createCount(dto, req.user); }
  @Put('counts/:id') updateCount(@Param('id') id: string, @Body() dto: UpdateCountDto, @Req() req: { user: AuthUser }) { return this.service.updateCount(id, dto, req.user); }
  @Post('counts/:id/start') startCount(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.startCount(id, req.user); }
  @Post('counts/:id/complete') completeCount(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.completeCount(id, req.user); }
  @Post('counts/:id/cancel') cancelCount(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.cancelCount(id, req.user); }
  @Delete('counts/:id') removeCount(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeCount(id, req.user); }

  @Get('transfers') transfers(@Req() req: { user: AuthUser }) { return this.service.listTransfers(req.user); }
  @Get('transfers/:id') transfer(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.getTransfer(id, req.user); }
  @Post('transfers') createTransfer(@Body() dto: CreateTransferDto, @Req() req: { user: AuthUser }) { return this.service.createTransfer(dto, req.user); }
  @Post('transfers/:id/receive') receiveTransfer(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.receiveTransfer(id, req.user); }
  @Delete('transfers/:id') removeTransfer(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeTransfer(id, req.user); }
}
