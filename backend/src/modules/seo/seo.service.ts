import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeoGlobal } from './seo-global.entity';
import { UpdateSeoGlobalDto } from './seo.dto';

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    @InjectRepository(SeoGlobal)
    private readonly seoGlobalRepository: Repository<SeoGlobal>,
  ) {}

  async getGlobalSettings(): Promise<SeoGlobal | null> {
    return this.seoGlobalRepository.findOne({ where: {} });
  }

  async updateGlobalSettings(dto: UpdateSeoGlobalDto): Promise<SeoGlobal> {
    let settings = await this.seoGlobalRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.seoGlobalRepository.create(dto);
    } else {
      Object.assign(settings, dto);
    }
    return this.seoGlobalRepository.save(settings);
  }
}