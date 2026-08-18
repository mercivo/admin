import { Module } from '@nestjs/common'; import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity } from './opportunity.entity'; import { OpportunityController } from './opportunity.controller'; import { OpportunityService } from './opportunity.service';
@Module({ imports: [TypeOrmModule.forFeature([Opportunity])], controllers: [OpportunityController], providers: [OpportunityService] }) export class OpportunityModule {}
