import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoGlobal } from './seo-global.entity';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SeoGlobal])],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}