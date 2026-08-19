import { BadRequestException, Body, Controller, Delete, Get, Param, ParseFilePipeBuilder, Post, Put, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthUser } from '../../common/types/auth-user';
import { WorkspaceService } from './workspace.service';
import { CreateTeamMemberDto, UpdateAccountSettingsDto, UpdateConfigDto, UpdateSiteSettingsDto, UpdateTeamMemberDto } from './workspace.dto';
import { SystemService } from '../system/system.service';
import { SubscribePlanDto } from '../system/system.dto';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService, private readonly system: SystemService) {}
  @Get('settings') settings(@Req() req: { user: AuthUser }) { return this.service.getSettings(req.user.userId, req.user.tenantId, req.user.siteId); }
  @Put('settings/account') updateAccount(@Body() dto: UpdateAccountSettingsDto, @Req() req: { user: AuthUser }) { return this.service.updateAccount(dto, req.user.userId, req.user.tenantId, req.user.siteId); }
  @Put('settings/site') updateSite(@Body() dto: UpdateSiteSettingsDto, @Req() req: { user: AuthUser }) { return this.service.updateSite(dto, req.user.tenantId, req.user.siteId); }
  @Get('config/:key') getConfig(@Param('key') key: string, @Req() req: { user: AuthUser }) { return this.service.getConfig(key, req.user.siteId); }
  @Put('config/:key') updateConfig(@Param('key') key: string, @Body() dto: UpdateConfigDto, @Req() req: { user: AuthUser }) { return this.service.updateConfig(key, dto.value, req.user.siteId); }
  @Get('team') listTeam(@Req() req: { user: AuthUser }) { return this.service.listTeam(req.user.userId, req.user.tenantId, req.user.siteId); }
  @Get('team/permissions') teamPermissions(@Req() req: { user: AuthUser }) { return this.service.teamPermissions(req.user.tenantId); }
  @Post('team') createMember(@Body() dto: CreateTeamMemberDto, @Req() req: { user: AuthUser }) { return this.service.createMember(dto, req.user); }
  @Put('team/:id') updateMember(@Param('id') id: string, @Body() dto: UpdateTeamMemberDto, @Req() req: { user: AuthUser }) { return this.service.updateMember(id, dto, req.user); }
  @Delete('team/:id') deleteMember(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.deleteMember(id, req.user); }
  @Get('knowledge') listKnowledge(@Req() req: { user: AuthUser }) { return this.service.listKnowledge(req.user.siteId); }
  @Post('knowledge')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500_000, files: 1 } }))
  createKnowledge(
    @UploadedFile(new ParseFilePipeBuilder()
      .addMaxSizeValidator({ maxSize: 500_000 })
      .build({ fileIsRequired: true, exceptionFactory: () => new BadRequestException('请选择 500KB 以内的 TXT、Markdown、CSV 或 JSON 文件') })) file: Express.Multer.File,
    @Req() req: { user: AuthUser },
  ) { return this.service.createKnowledge(file, req.user.tenantId, req.user.siteId); }
  @Delete('knowledge/:id') deleteKnowledge(@Param('id') id: string, @Req() req: { user: AuthUser }) { return this.service.deleteKnowledge(id, req.user.siteId); }
  @Get('plans') plans() { return this.system.listPlans(true); }
  @Get('subscription-orders') orders(@Req() req: { user: AuthUser }) { return this.system.tenantOrders(req.user.tenantId); }
  @Post('subscriptions') subscribe(@Body() dto: SubscribePlanDto, @Req() req: { user: AuthUser }) { return this.system.subscribe(req.user.tenantId, dto.planId); }
}
