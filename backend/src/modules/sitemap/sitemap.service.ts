import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SitemapInfo } from './sitemap.entity';
import { HreflangConfig } from './hreflang.entity';
import { UpdateRobotsDto } from './sitemap.dto';

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);

  constructor(
    @InjectRepository(SitemapInfo)
    private readonly sitemapRepository: Repository<SitemapInfo>,
    @InjectRepository(HreflangConfig)
    private readonly hreflangRepository: Repository<HreflangConfig>,
  ) {}

  async getStatus(): Promise<SitemapInfo | null> {
    return this.sitemapRepository.findOne({ where: {} });
  }

  async generateSitemap(): Promise<SitemapInfo> {
    let info = await this.sitemapRepository.findOne({ where: {} });
    if (!info) {
      info = this.sitemapRepository.create({ status: 'generated', lastGeneratedAt: new Date() });
    } else {
      info.status = 'generated';
      info.lastGeneratedAt = new Date();
    }
    this.logger.log('Sitemap generated successfully');
    return this.sitemapRepository.save(info);
  }

  async getRobots(): Promise<{ content: string }> {
    return {
      content: `User-agent: *\nDisallow: /api/\nAllow: /\n\nSitemap: https://example.com/sitemap.xml`,
    };
  }

  async updateRobots(dto: UpdateRobotsDto): Promise<{ content: string }> {
    return { content: dto.content };
  }

  async getHreflangStatus(): Promise<{ configs: HreflangConfig[]; isValid: boolean }> {
    const configs = await this.hreflangRepository.find();
    return { configs, isValid: configs.length > 0 };
  }
}