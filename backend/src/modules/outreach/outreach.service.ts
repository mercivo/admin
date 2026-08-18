import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { CreateOutreachCampaignDto, ScheduleOutreachCampaignDto, UpdateOutreachCampaignDto } from './outreach.dto';
import { OutreachCampaign } from './outreach-campaign.entity';

@Injectable()
export class OutreachService {
  constructor(
    @InjectRepository(OutreachCampaign) private readonly campaigns: Repository<OutreachCampaign>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
  ) {}

  list(siteId: string) { return this.campaigns.find({ where: { siteId }, order: { updatedAt: 'DESC' } }); }

  async stats(siteId: string) {
    const items = await this.list(siteId);
    const sent = items.reduce((sum, item) => sum + item.sentCount, 0);
    const opened = items.reduce((sum, item) => sum + item.openCount, 0);
    const replied = items.reduce((sum, item) => sum + item.replyCount, 0);
    return { campaigns: items.length, sent, pending: items.filter(item => item.status === 'scheduled').reduce((sum, item) => sum + item.recipientCount, 0), openRate: sent ? Math.round(opened / sent * 1000) / 10 : 0, replyRate: sent ? Math.round(replied / sent * 1000) / 10 : 0 };
  }

  async create(dto: CreateOutreachCampaignDto, tenantId: string, siteId: string, userId: string) {
    const recipientCount = await this.recipientCount(dto.audienceType, siteId);
    return this.campaigns.save(this.campaigns.create({ ...dto, tenantId, siteId, createdBy: userId, recipientCount, status: 'draft', scheduledAt: null }));
  }

  async update(id: string, dto: UpdateOutreachCampaignDto, siteId: string) {
    const campaign = await this.get(id, siteId);
    if (campaign.status === 'sending' || campaign.status === 'completed') throw new BadRequestException('发送中或已完成的任务不可修改');
    Object.assign(campaign, dto);
    if (dto.audienceType) campaign.recipientCount = await this.recipientCount(dto.audienceType, siteId);
    return this.campaigns.save(campaign);
  }

  async schedule(id: string, dto: ScheduleOutreachCampaignDto, siteId: string) {
    const campaign = await this.get(id, siteId);
    if (!campaign.subject.trim() || !campaign.content.trim()) throw new BadRequestException('请先完善邮件主题和正文');
    if (dto.scheduledAt.getTime() <= Date.now()) throw new BadRequestException('发送时间必须晚于当前时间');
    campaign.recipientCount = await this.recipientCount(campaign.audienceType, siteId);
    if (!campaign.recipientCount) throw new BadRequestException('当前受众没有可发送的联系人');
    campaign.scheduledAt = dto.scheduledAt; campaign.status = 'scheduled';
    return this.campaigns.save(campaign);
  }

  async remove(id: string, siteId: string) {
    const campaign = await this.get(id, siteId);
    if (campaign.status === 'sending') throw new BadRequestException('发送中的任务不可删除');
    await this.campaigns.remove(campaign);
  }

  private async get(id: string, siteId: string) {
    const campaign = await this.campaigns.findOne({ where: { id, siteId } });
    if (!campaign) throw new NotFoundException('开发信任务不存在');
    return campaign;
  }
  private recipientCount(type: 'customers' | 'leads', siteId: string) {
    return type === 'customers' ? this.customers.count({ where: { siteId, status: 'active' } }) : this.leads.count({ where: { siteId } });
  }
}
