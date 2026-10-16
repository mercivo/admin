import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer, CustomerLevelRule } from './customer.entity';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { Site } from '../site/site.entity';
import { AppConfig } from '../workspace/app-config.entity';
@Module({ imports: [TypeOrmModule.forFeature([Customer, CustomerLevelRule, Site, AppConfig])], controllers: [CustomerController], providers: [CustomerService] })
export class CustomerModule {}
