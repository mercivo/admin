import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { OutreachCampaign } from './outreach-campaign.entity';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';

@Module({ imports: [TypeOrmModule.forFeature([OutreachCampaign, Customer, Lead])], controllers: [OutreachController], providers: [OutreachService] })
export class OutreachModule {}
