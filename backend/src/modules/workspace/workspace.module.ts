import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from './app-config.entity';
import { TeamMember } from './team-member.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { User } from '../auth/user.entity';
import { Tenant } from '../site/tenant.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { SystemModule } from '../system/system.module';
import { Product } from '../product/product.entity';
import { Warehouse } from '../inventory/inventory.entity';

@Module({ imports: [TypeOrmModule.forFeature([AppConfig, TeamMember, User, Tenant, Site, SiteDomain, Product, Warehouse]), SystemModule], controllers: [WorkspaceController], providers: [WorkspaceService] })
export class WorkspaceModule {}
