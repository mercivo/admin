import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from './app-config.entity';
import { TeamMember } from './team-member.entity';
import { KnowledgeFile } from './knowledge-file.entity';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { User } from '../auth/user.entity';
import { Tenant } from '../site/tenant.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { SystemModule } from '../system/system.module';

@Module({ imports: [TypeOrmModule.forFeature([AppConfig, TeamMember, KnowledgeFile, User, Tenant, Site, SiteDomain]), SystemModule], controllers: [WorkspaceController], providers: [WorkspaceService] })
export class WorkspaceModule {}
