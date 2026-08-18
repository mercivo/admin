import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { CreateOutreachCampaignDto, ScheduleOutreachCampaignDto, UpdateOutreachCampaignDto } from './outreach.dto';
import { OutreachService } from './outreach.service';

@Controller('outreach')
export class OutreachController {
  constructor(private readonly service: OutreachService) {}
  @Get() list(@Req() req: { user: AuthUser }) { return this.service.list(req.user.siteId); }
  @Get('stats') stats(@Req() req: { user: AuthUser }) { return this.service.stats(req.user.siteId); }
  @Post() create(@Body() dto: CreateOutreachCampaignDto, @Req() req: { user: AuthUser }) { return this.service.create(dto, req.user.tenantId, req.user.siteId, req.user.userId); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateOutreachCampaignDto, @Req() req: { user: AuthUser }) { return this.service.update(id, dto, req.user.siteId); }
  @Post(':id/schedule') schedule(@Param('id') id: string, @Body() dto: ScheduleOutreachCampaignDto, @Req() req: { user: AuthUser }) { return this.service.schedule(id, dto, req.user.siteId); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.remove(id, req.user.siteId); }
}
