import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, CreateCustomerLevelDto, UpdateCustomerDto, UpdateCustomerLevelDto, UpdateGuestPricingDto } from './customer.dto';

@Controller('customers')
export class CustomerController {
  constructor(private readonly service: CustomerService) {}
  @Get() list(@Req() req: { user: AuthUser }) { return this.service.list(req.user.siteId); }
  @Post() create(@Body() dto: CreateCustomerDto, @Req() req: { user: AuthUser }) { return this.service.create(dto, req.user.tenantId, req.user.siteId); }
  @Get('levels') levels(@Req() req: { user: AuthUser }) { return this.service.listLevels(req.user.siteId); }
  @Get('pricing-policy') pricingPolicy(@Req() req: { user: AuthUser }) { return this.service.getGuestPricing(req.user.siteId); }
  @Put('pricing-policy') updatePricingPolicy(@Body() dto: UpdateGuestPricingDto, @Req() req: { user: AuthUser }) { return this.service.updateGuestPricing(req.user.siteId, dto.mode); }
  @Post('levels') createLevel(@Body() dto: CreateCustomerLevelDto, @Req() req: { user: AuthUser }) { return this.service.createLevel(dto, req.user.tenantId, req.user.siteId); }
  @Put('levels/:id') updateLevel(@Param('id') id: string, @Body() dto: UpdateCustomerLevelDto, @Req() req: { user: AuthUser }) { return this.service.updateLevel(id, dto, req.user.siteId); }
  @Delete('levels/:id') removeLevel(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.removeLevel(id, req.user.siteId); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: { user: AuthUser }) { return this.service.update(id, dto, req.user.siteId); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.remove(id, req.user.siteId); }
}
