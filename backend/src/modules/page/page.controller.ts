import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { PageService } from './page.service';
import { UpsertPageOverrideDto } from './page.dto';
import { PageType } from './page-override.entity';

@Controller('page')
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Get('override/:type/:lang')
  async getOverride(
    @Param('type') type: PageType,
    @Param('lang') lang: string,
    @Query('pageId') pageId?: string,
  ) {
    return this.pageService.getOverride(type, lang, pageId);
  }

  @Put('override')
  async upsertOverride(@Body() dto: UpsertPageOverrideDto) {
    return this.pageService.upsertOverride(dto);
  }
}