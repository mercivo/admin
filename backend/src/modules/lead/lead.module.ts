import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './lead.entity';
import { LeadService } from './lead.service';
import { LeadController } from './lead.controller';
import { Customer } from '../customer/customer.entity';
import { Opportunity } from '../opportunity/opportunity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Customer, Opportunity])],
  controllers: [LeadController],
  providers: [LeadService],
  exports: [LeadService],
})
export class LeadModule {}
