import { Controller, Get, Post, Put, Body } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { UpdateRobotsDto } from './sitemap.dto';

@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('status')
  async getStatus() {
    return this.sitemapService.getStatus();
  }

  @Post('generate')
  async generateSitemap() {
    return this.sitemapService.generateSitemap();
  }

  @Get('robots')
  async getRobots() {
    return this.sitemapService.getRobots();
  }

  @Put('robots')
  async updateRobots(@Body() dto: UpdateRobotsDto) {
    return this.sitemapService.updateRobots(dto);
  }

  @Get('hreflang/status')
  async getHreflangStatus() {
    return this.sitemapService.getHreflangStatus();
  }
}