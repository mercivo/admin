import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../site/tenant.entity';
import { Product } from '../product/product.entity';
import { User } from '../auth/user.entity';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { Plan } from './plan.entity';
import { SubscriptionOrder } from './subscription-order.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { Customer } from '../customer/customer.entity';
import { Warehouse } from '../inventory/inventory.entity';

@Module({ imports: [TypeOrmModule.forFeature([Tenant, Product, User, Plan, SubscriptionOrder, Site, SiteDomain, Customer, Warehouse])], controllers: [SystemController], providers: [SystemService], exports: [SystemService] })
export class SystemModule {}
