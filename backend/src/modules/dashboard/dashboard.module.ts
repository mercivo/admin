import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { Lead } from '../lead/lead.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Agent } from '../agent/agent.entity';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Lead, Agent, Customer, AppConfig])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
