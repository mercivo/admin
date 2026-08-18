import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageOverride, PageType } from './page-override.entity';
import { UpsertPageOverrideDto } from './page.dto';

@Injectable()
export class PageService {
  constructor(
    @InjectRepository(PageOverride)
    private readonly pageOverrideRepository: Repository<PageOverride>,
  ) {}

  async getOverride(pageType: PageType, language: string, pageId?: string): Promise<PageOverride | null> {
    const where: Record<string, unknown> = { pageType, language };
    if (pageId) {
      where.pageId = pageId;
    }
    return this.pageOverrideRepository.findOne({ where });
  }

  async upsertOverride(dto: UpsertPageOverrideDto): Promise<PageOverride> {
    const where: Record<string, unknown> = {
      pageType: dto.pageType,
      language: dto.language,
    };
    if (dto.pageId) {
      where.pageId = dto.pageId;
    }

    let override = await this.pageOverrideRepository.findOne({ where });
    if (!override) {
      override = this.pageOverrideRepository.create({
        pageType: dto.pageType,
        pageId: dto.pageId || '',
        language: dto.language,
        title: dto.title,
        description: dto.description,
        keywords: dto.keywords || [],
        socialTitle: dto.socialTitle,
        socialDescription: dto.socialDescription,
        socialImage: dto.socialImage,
      });
    } else {
      Object.assign(override, {
        title: dto.title,
        description: dto.description,
        keywords: dto.keywords || [],
        socialTitle: dto.socialTitle,
        socialDescription: dto.socialDescription,
        socialImage: dto.socialImage,
      });
    }
    return this.pageOverrideRepository.save(override);
  }
}