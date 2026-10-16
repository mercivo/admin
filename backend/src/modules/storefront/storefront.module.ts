import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { StorefrontService } from './storefront.service';
import { StorefrontController, StorefrontInquiryController } from './storefront.controller';
import { StorefrontInquiryLead } from './inquiry-lead.entity';
import { SiteModule } from '../site/site.module';
import { ProductCategory } from '../product-category/product-category.entity';
import { TeamMember } from '../workspace/team-member.entity';

@Module({
  imports: [SiteModule, TypeOrmModule.forFeature([Product, ProductCategory, StorefrontInquiryLead, TeamMember])],
  controllers: [StorefrontController, StorefrontInquiryController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
