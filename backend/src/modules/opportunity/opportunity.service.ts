import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './opportunity.entity';
import { CreateOpportunityDto, UpdateOpportunityDto } from './opportunity.dto';
@Injectable()
export class OpportunityService {
  constructor(@InjectRepository(Opportunity) private readonly repo: Repository<Opportunity>) {}
  list(siteId: string) { return this.repo.find({ where: { siteId }, order: { updatedAt: 'DESC' } }); }
  create(dto: CreateOpportunityDto, tenantId: string, siteId: string) { return this.repo.save(this.repo.create({ ...dto, nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : null, tenantId, siteId, sourceLeadId: null, customerId: null })); }
  async update(id: string, dto: UpdateOpportunityDto, siteId: string) { const item = await this.repo.findOne({ where: { id, siteId } }); if (!item) throw new NotFoundException('商机不存在'); Object.assign(item, dto, { nextFollowUp: dto.nextFollowUp ? new Date(dto.nextFollowUp) : null }); return this.repo.save(item); }
  async remove(id: string, siteId: string) { const item = await this.repo.findOne({ where: { id, siteId } }); if (!item) throw new NotFoundException('商机不存在'); await this.repo.remove(item); }
}
