import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { Tenant } from '../site/tenant.entity';
import { DictEntry } from '../dict/dict-entry.entity';
import { ProductStorageService } from './product-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Tenant, DictEntry])],
  controllers: [ProductController],
  providers: [ProductService, ProductStorageService],
  exports: [ProductService],
})
export class ProductModule {}
