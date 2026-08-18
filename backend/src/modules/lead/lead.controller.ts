import { Controller, Get, Post, Put, Delete, Param, Body, Req } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user';
import { LeadService } from './lead.service';
import { CreateLeadDto, UpdateLeadDto } from './lead.dto';

@Controller('lead')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Get()
  async findAll(@Req() req: { user: AuthUser }) {
    return this.leadService.findAll(req.user.siteId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.leadService.findById(id, req.user.siteId);
  }

  @Post()
  async create(@Body() dto: CreateLeadDto, @Req() req: { user: AuthUser }) {
    return this.leadService.create(dto, req.user.tenantId, req.user.siteId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @Req() req: { user: AuthUser }) {
    return this.leadService.update(id, dto, req.user.siteId);
  }

  @Post(':id/convert')
  async convert(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.leadService.convertToCustomer(id, req.user.tenantId, req.user.siteId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.leadService.remove(id, req.user.siteId);
  }
}
