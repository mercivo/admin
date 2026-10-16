import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { Site } from '../site/site.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
import { TranslationUnit } from './translation-unit.entity';
import { TranslationValue } from './translation-value.entity';
import { TranslationImportCacheService } from './translation-import-cache.service';

@Module({ imports: [TypeOrmModule.forFeature([TranslationUnit, TranslationValue, Product, ProductCategory, AppConfig, Site])], controllers: [TranslationController], providers: [TranslationService, TranslationImportCacheService], exports: [TranslationService] })
export class TranslationModule {}
