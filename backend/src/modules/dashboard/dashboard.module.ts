import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Customer, AppConfig])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
