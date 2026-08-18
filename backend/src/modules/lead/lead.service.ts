import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';
import { CreateLeadDto, UpdateLeadDto } from './lead.dto';
import { Customer } from '../customer/customer.entity';
import { Opportunity } from '../opportunity/opportunity.entity';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(siteId: string): Promise<Lead[]> {
    return this.leadRepository.find({ where: { siteId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string, siteId: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({ where: { id, siteId } });
    if (!lead) {
      throw new NotFoundException(`Lead with id ${id} not found`);
    }
    return lead;
  }

  async create(dto: CreateLeadDto, tenantId: string, siteId: string): Promise<Lead> {
    const lead = this.leadRepository.create({ ...dto, tenantId, siteId });
    return this.leadRepository.save(lead);
  }

  async update(id: string, dto: UpdateLeadDto, siteId: string): Promise<Lead> {
    const lead = await this.findById(id, siteId);
    Object.assign(lead, dto);
    return this.leadRepository.save(lead);
  }

  async remove(id: string, siteId: string): Promise<void> {
    const lead = await this.findById(id, siteId);
    await this.leadRepository.remove(lead);
  }

  async convertToCustomer(id: string, tenantId: string, siteId: string): Promise<{ lead: Lead; customer: Customer; opportunity: Opportunity }> {
    const lead = await this.findById(id, siteId);
    return this.leadRepository.manager.transaction(async manager => {
      const customerRepo = manager.getRepository(Customer);
      const opportunityRepo = manager.getRepository(Opportunity);
      const phoneNormalized = lead.phone?.trim().replace(/[\s()-]/g, '') || null;
      let customer = lead.email ? await customerRepo.findOne({ where: { siteId, email: lead.email } }) : null;
      if (!customer && phoneNormalized) customer = await customerRepo.findOne({ where: { siteId, phoneNormalized } });
      if (!customer) customer = await customerRepo.save(customerRepo.create({ tenantId, siteId, name: lead.name, company: lead.company, email: lead.email, phone: lead.phone || null, phoneNormalized, country: lead.country, level: 'C', orders: 0, totalAmount: 0, lastOrderAt: null, notes: lead.summary }));
      let opportunity = await opportunityRepo.findOne({ where: { siteId, sourceLeadId: lead.id } });
      if (!opportunity) opportunity = await opportunityRepo.save(opportunityRepo.create({ tenantId, siteId, sourceLeadId: lead.id, customerId: customer.id, company: lead.company || lead.name, contact: lead.name, email: lead.email, country: lead.country, product: lead.product || '待确认需求', value: 0, probability: Math.max(10, Math.min(90, lead.score || 20)), owner: lead.assignedTo || '', nextFollowUp: null, stage: 'new', source: 'website', notes: lead.summary }));
      lead.status = 'converted';
      await manager.getRepository(Lead).save(lead);
      return { lead, customer, opportunity };
    });
  }
}
