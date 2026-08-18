import { Controller, Get, Post, Put, Delete, Param, Body, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { AgentService } from './agent.service';
import { CreateAgentDto, InstallAgentPresetDto, UpdateAgentDto } from './agent.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('presets/catalog')
  presets() { return this.agentService.listPresets(); }

  @Post('presets/install')
  installPreset(@Body() dto: InstallAgentPresetDto, @Req() req: { user: AuthUser }) {
    return this.agentService.installPreset(dto.presetId, req.user.tenantId, req.user.siteId);
  }

  @Get()
  async findAll(@Req() req: { user: AuthUser }) {
    return this.agentService.findAll(req.user.siteId);
  }

  @Get(':agentId')
  async findById(@Param('agentId') agentId: string, @Req() req: { user: AuthUser }) {
    return this.agentService.findById(agentId, req.user.siteId);
  }

  @Post()
  async create(@Body() dto: CreateAgentDto, @Req() req: { user: AuthUser }) {
    return this.agentService.create(dto, req.user.tenantId, req.user.siteId);
  }

  @Put(':agentId')
  async update(@Param('agentId') agentId: string, @Body() dto: UpdateAgentDto, @Req() req: { user: AuthUser }) {
    return this.agentService.update(agentId, dto, req.user.siteId);
  }

  @Delete(':agentId')
  async remove(@Param('agentId') agentId: string, @Req() req: { user: AuthUser }) {
    return this.agentService.remove(agentId, req.user.siteId);
  }
}
