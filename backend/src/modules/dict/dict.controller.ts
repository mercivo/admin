import { Controller, Get, Post, Put, Delete, Param, Body, Req } from '@nestjs/common';
import { DictService } from './dict.service';
import { CreateDictEntryDto, UpdateDictEntryDto } from './dict.dto';
import { AuthUser } from '../../common/types/auth-user';

@Controller('dict')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get('tree')
  async getFullTree(@Req() req: { user: AuthUser }) {
    return this.dictService.getFullTree(req.user.siteId);
  }

  @Get('types')
  async findAllTypes(@Req() req: { user: AuthUser }) {
    return this.dictService.findAllTypes(req.user.siteId);
  }

  @Get(':typeId/entries')
  async findEntries(@Param('typeId') typeId: string, @Req() req: { user: AuthUser }) {
    return this.dictService.findEntriesByType(typeId, req.user.siteId);
  }

  @Post(':typeId/entries')
  async createEntry(@Param('typeId') typeId: string, @Body() dto: CreateDictEntryDto, @Req() req: { user: AuthUser }) {
    return this.dictService.createEntry(typeId, dto, req.user.tenantId, req.user.siteId);
  }

  @Put(':typeId/entries/:code')
  async updateEntry(
    @Param('typeId') typeId: string,
    @Param('code') code: string,
    @Body() dto: UpdateDictEntryDto, @Req() req: { user: AuthUser },
  ) {
    return this.dictService.updateEntry(typeId, code, dto, req.user.siteId);
  }

  @Delete(':typeId/entries/:code')
  async deleteEntry(@Param('typeId') typeId: string, @Param('code') code: string, @Req() req: { user: AuthUser }) {
    return this.dictService.deleteEntry(typeId, code, req.user.siteId);
  }
}
