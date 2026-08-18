import { Controller, Get, Put, Body } from '@nestjs/common';
import { SeoService } from './seo.service';
import { UpdateSeoGlobalDto } from './seo.dto';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('global')
  async getGlobalSettings() {
    return this.seoService.getGlobalSettings();
  }

  @Put('global')
  async updateGlobalSettings(@Body() dto: UpdateSeoGlobalDto) {
    return this.seoService.updateGlobalSettings(dto);
  }
}