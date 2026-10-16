import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemService } from './system.service';
import { CreateTenantDto, SavePlanDto, UpdateTenantControlDto } from './system.dto';
import { SystemListQueryDto } from './system-query.dto';

@Controller('system')
@Roles('system_admin')
export class SystemController {
  constructor(private readonly service: SystemService) {}
  @Get('overview') overview() { return this.service.overview(); }
  @Get('analytics') analytics() { return this.service.analytics(); }
  @Get('tenants') tenants(@Query() query: SystemListQueryDto) { return this.service.listTenants(query); }
  @Post('tenants') createTenant(@Body() dto: CreateTenantDto) { return this.service.createTenant(dto); }
  @Patch('tenants/:id') update(@Param('id') id: string, @Body() dto: UpdateTenantControlDto) { return this.service.updateTenant(id, dto); }
  @Post('tenants/:id/reset-password') resetPassword(@Param('id') id: string) { return this.service.resetTenantPassword(id); }
  @Get('permissions') permissions() { return this.service.permissionCatalog(); }
  @Get('plans') plans() { return this.service.listPlans(false); }
  @Get('plan-options') planOptions() { return this.service.listPlans(false); }
  @Post('plans') createPlan(@Body() dto: SavePlanDto) { return this.service.createPlan(dto); }
  @Put('plans/:id') updatePlan(@Param('id') id: string, @Body() dto: SavePlanDto) { return this.service.updatePlan(id, dto); }
  @Delete('plans/:id') deletePlan(@Param('id') id: string) { return this.service.deletePlan(id); }
  @Get('orders') orders(@Query() query: SystemListQueryDto) { return this.service.listOrders(query); }
}
