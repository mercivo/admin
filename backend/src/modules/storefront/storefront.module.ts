import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Testimonial } from './testimonial.entity';
import { Product } from '../product/product.entity';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial, Product])],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}