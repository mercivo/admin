import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer, CustomerLevelRule } from './customer.entity';
import { CreateCustomerDto, CreateCustomerLevelDto, UpdateCustomerDto, UpdateCustomerLevelDto } from './customer.dto';
import { Site } from '../site/site.entity';

@Injectable()
export class CustomerService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>, @InjectRepository(CustomerLevelRule) private readonly rules: Repository<CustomerLevelRule>, @InjectRepository(Site) private readonly sites: Repository<Site>) {}
  list(siteId: string) { return this.customers.find({ where: { siteId }, order: { updatedAt: 'DESC' } }); }
  async create(dto: CreateCustomerDto, tenantId: string, siteId: string) {
    await this.ensureLevel(dto.level, siteId);
    const phoneNormalized = this.normalizePhone(dto.phone);
    if (await this.customers.exists({ where: { siteId, phoneNormalized } })) throw new ConflictException('该手机号已存在客户档案');
    return this.customers.save(this.customers.create({ ...dto, phone: dto.phone.trim(), phoneNormalized, status: dto.status || 'active', tenantId, siteId }));
  }
  async update(id: string, dto: UpdateCustomerDto, siteId: string) {
    const item = await this.customers.findOne({ where: { id, siteId } });
    if (!item) throw new NotFoundException('客户不存在');
    await this.ensureLevel(dto.level, siteId);
    const phoneNormalized = this.normalizePhone(dto.phone);
    const duplicate = await this.customers.findOne({ where: { siteId, phoneNormalized } });
    if (duplicate && duplicate.id !== id) throw new ConflictException('该手机号已存在客户档案');
    Object.assign(item, dto, { phone: dto.phone.trim(), phoneNormalized });
    return this.customers.save(item);
  }
  async remove(id: string, siteId: string) { const item = await this.customers.findOne({ where: { id, siteId } }); if (!item) throw new NotFoundException('客户不存在'); await this.customers.remove(item); }
  listLevels(siteId: string) { return this.rules.find({ where: { siteId }, order: { updatedAt: 'DESC' } }); }
  async createLevel(dto: CreateCustomerLevelDto, tenantId: string, siteId: string) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('请输入客户等级名称');
    if (await this.rules.exists({ where: { siteId, name } })) throw new ConflictException('客户等级名称已存在');
    const code = `lvl_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    return this.rules.save(this.rules.create({ ...dto, name, note: dto.note?.trim() || '', code, tenantId, siteId, minAmount: 0, minOrders: 0, discountRate: 0, sort: 0 }));
  }
  async updateLevel(id: string, dto: UpdateCustomerLevelDto, siteId: string) {
    const level = await this.rules.findOne({ where: { id, siteId } });
    if (!level) throw new NotFoundException('客户等级不存在');
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('请输入客户等级名称');
    const duplicate = await this.rules.findOne({ where: { siteId, name } });
    if (duplicate && duplicate.id !== id) throw new ConflictException('客户等级名称已存在');
    level.name = name; level.note = dto.note?.trim() || '';
    return this.rules.save(level);
  }
  async removeLevel(id: string, siteId: string) {
    const level = await this.rules.findOne({ where: { id, siteId } });
    if (!level) throw new NotFoundException('客户等级不存在');
    await this.customers.update({ siteId, level: level.code }, { level: '' });
    await this.rules.remove(level);
  }
  async getGuestPricing(siteId: string) {
    const site = await this.sites.findOne({ where: { id: siteId } });
    if (!site) throw new NotFoundException('站点不存在');
    return { mode: site.guestPriceMode || 'base' };
  }
  async updateGuestPricing(siteId: string, mode: 'base' | 'hidden') {
    const site = await this.sites.findOne({ where: { id: siteId } });
    if (!site) throw new NotFoundException('站点不存在');
    site.guestPriceMode = mode;
    await this.sites.save(site);
    return { mode };
  }
  private async ensureLevel(code: string | undefined, siteId: string) {
    if (!code) return;
    if (!(await this.rules.exists({ where: { siteId, code } }))) throw new BadRequestException('请选择有效的客户等级');
  }
  private normalizePhone(phone: string) {
    const normalized = phone.trim().replace(/[\s()-]/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(normalized)) throw new BadRequestException('请输入有效手机号');
    return normalized;
  }
}
