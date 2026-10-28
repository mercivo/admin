import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { Site } from './site.entity';
import { SiteDomain } from './site-domain.entity';
import { SiteVersion } from './site-version.entity';
import { Product } from '../product/product.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { SiteAdminController, SitePublicController } from './site.controller';
import { SiteService } from './site.service';
import { ProductCategory } from '../product-category/product-category.entity';
import { Warehouse } from '../inventory/inventory.entity';
import { TranslationModule } from '../translation/translation.module';
import { CloudflareCustomHostnameService } from './cloudflare-custom-hostname.service';

@Module({ imports: [TranslationModule, TypeOrmModule.forFeature([Tenant, Site, SiteDomain, SiteVersion, Product, AppConfig, ProductCategory, Warehouse])], controllers: [SiteAdminController, SitePublicController], providers: [SiteService, CloudflareCustomHostnameService], exports: [SiteService] })
export class SiteModule {}
