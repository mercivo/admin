import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../site/tenant.entity';
import { Product } from '../product/product.entity';
import { Lead } from '../lead/lead.entity';
import { Agent } from '../agent/agent.entity';
import { User } from '../auth/user.entity';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { Plan } from './plan.entity';
import { SubscriptionOrder } from './subscription-order.entity';
import { AgentPreset } from '../agent/agent-preset.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { Opportunity } from '../opportunity/opportunity.entity';
import { OutreachCampaign } from '../outreach/outreach-campaign.entity';
import { KnowledgeFile } from '../workspace/knowledge-file.entity';
import { Customer } from '../customer/customer.entity';

@Module({ imports: [TypeOrmModule.forFeature([Tenant, Product, Lead, Agent, AgentPreset, User, Plan, SubscriptionOrder, Site, SiteDomain, Opportunity, OutreachCampaign, KnowledgeFile, Customer])], controllers: [SystemController], providers: [SystemService], exports: [SystemService] })
export class SystemModule {}
