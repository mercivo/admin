import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './opportunity.dto';
@Controller('opportunities')
export class OpportunityController {
  constructor(private readonly service: OpportunityService) {}
  @Get() list(@Req() req: { user: AuthUser }) { return this.service.list(req.user.siteId); }
  @Post() create(@Body() dto: CreateOpportunityDto, @Req() req: { user: AuthUser }) { return this.service.create(dto, req.user.tenantId, req.user.siteId); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateOpportunityDto, @Req() req: { user: AuthUser }) { return this.service.update(id, dto, req.user.siteId); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.remove(id, req.user.siteId); }
}
