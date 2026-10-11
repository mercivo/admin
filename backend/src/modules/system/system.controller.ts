import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemService } from './system.service';
import { SavePlanDto, UpdateTenantControlDto } from './system.dto';

@Controller('system')
@Roles('system_admin')
export class SystemController {
  constructor(private readonly service: SystemService) {}
  @Get('overview') overview() { return this.service.overview(); }
  @Get('analytics') analytics() { return this.service.analytics(); }
  @Get('tenants') tenants() { return this.service.listTenants(); }
  @Patch('tenants/:id') update(@Param('id') id: string, @Body() dto: UpdateTenantControlDto) { return this.service.updateTenant(id, dto); }
  @Get('permissions') permissions() { return this.service.permissionCatalog(); }
  @Get('plans') plans() { return this.service.listPlans(false); }
  @Post('plans') createPlan(@Body() dto: SavePlanDto) { return this.service.createPlan(dto); }
  @Put('plans/:id') updatePlan(@Param('id') id: string, @Body() dto: SavePlanDto) { return this.service.updatePlan(id, dto); }
  @Delete('plans/:id') deletePlan(@Param('id') id: string) { return this.service.deletePlan(id); }
  @Get('orders') orders() { return this.service.listOrders(); }
}
