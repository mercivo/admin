import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { Site } from './site.entity';
import { SiteDomain } from './site-domain.entity';
import { SiteVersion } from './site-version.entity';
import { Product } from '../product/product.entity';
import { Agent } from '../agent/agent.entity';
import { Testimonial } from '../storefront/testimonial.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { SiteAdminController, SitePublicController } from './site.controller';
import { SiteService } from './site.service';
import { Lead } from '../lead/lead.entity';
import { CacheService } from '../../common/cache/cache.service';
import { DictEntry } from '../dict/dict-entry.entity';
import { Customer } from '../customer/customer.entity';
import { AuthModule } from '../auth/auth.module';

@Module({ imports: [AuthModule, TypeOrmModule.forFeature([Tenant, Site, SiteDomain, SiteVersion, Product, Agent, Testimonial, AppConfig, Lead, DictEntry, Customer])], controllers: [SiteAdminController, SitePublicController], providers: [SiteService, CacheService], exports: [SiteService] })
export class SiteModule {}
