import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { CreateInquiryLeadDto, InquiryLeadQueryDto, StorefrontProductQueryDto, UpdateInquiryLeadDto } from './storefront.dto';
import { StorefrontInquiryLead } from './inquiry-lead.entity';
import { SiteService } from '../site/site.service';
import { pageLimit, pageOffset, pageResult } from '../../common/dto/page-query.dto';
import { ProductCategory } from '../product-category/product-category.entity';
import { TeamMember } from '../workspace/team-member.entity';
import { AuthUser } from '../../common/types/auth-user';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepository: Repository<ProductCategory>,
    @InjectRepository(StorefrontInquiryLead)
    private readonly leadRepository: Repository<StorefrontInquiryLead>,
    @InjectRepository(TeamMember)
    private readonly teamRepository: Repository<TeamMember>,
    private readonly siteService: SiteService,
  ) {}

  async overview(user: AuthUser) {
    const scope = { siteId: user.siteId, ...(user.role === 'admin' ? {} : { assignedToUserId: user.userId }) };
    const [totalProducts, publishedProducts, totalLeads, newLeads, followingLeads, convertedLeads, recentLeads] = await Promise.all([
      this.productRepository.count({ where: { siteId: user.siteId } }),
      this.productRepository.count({ where: { siteId: user.siteId, status: 'published' } }),
      this.leadRepository.count({ where: { ...scope, status: In(['new', 'following', 'converted', 'closed']) } }),
      this.leadRepository.count({ where: { ...scope, status: 'new' } }),
      this.leadRepository.count({ where: { ...scope, status: 'following' } }),
      this.leadRepository.count({ where: { ...scope, status: 'converted' } }),
      this.leadRepository.find({ where: scope, order: { createdAt: 'DESC' }, take: 5 }),
    ]);
    return { products: { total: totalProducts, published: publishedProducts, pending: totalProducts - publishedProducts }, leads: { total: totalLeads, new: newLeads, following: followingLeads, converted: convertedLeads }, recentLeads };
  }

  async productPool(query: StorefrontProductQueryDto, siteId: string) {
    const builder = this.productRepository.createQueryBuilder('product').where('product.site_id = :siteId', { siteId }).andWhere('product.status = :status', { status: 'published' });
    if (query.category) {
      const categories = query.category.split(',').map(item => item.trim()).filter(Boolean);
      if (categories.length) builder.andWhere('product.category IN (:...categories)', { categories });
    }
    if (query.keyword?.trim()) builder.andWhere('(product.name_zh LIKE :keyword OR product.sku LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    const [items, total] = await builder.orderBy('product.updated_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    const [counts, categoryEntries] = await Promise.all([
      this.productRepository.createQueryBuilder('product').select('product.category', 'category').addSelect('COUNT(product.id)', 'count').where('product.site_id = :siteId', { siteId }).andWhere('product.status = :status', { status: 'published' }).groupBy('product.category').getRawMany(),
      this.categoryRepository.find({ where: { siteId, status: 'enabled' }, order: { sort: 'ASC', createdAt: 'ASC' } }),
    ]);
    const buildCategories = (parentCode: string | null): Array<ProductCategory & { children: unknown[] }> => categoryEntries
      .filter(entry => entry.parentCode === parentCode)
      .map(entry => ({ ...entry, children: buildCategories(entry.code) }));
    const categoryCounts: Record<string, number> = Object.fromEntries(counts.map(row => [String(row.category || ''), Number(row.count)]));
    return { ...pageResult(items, total, query), categoryCounts, categories: buildCategories(null), summary: { totalProducts: Object.values(categoryCounts).reduce((sum, count) => sum + Number(count), 0) } };
  }

  async listLeads(query: InquiryLeadQueryDto, user: AuthUser) {
    const builder = this.leadRepository.createQueryBuilder('lead').where('lead.site_id = :siteId', { siteId: user.siteId });
    if (user.role !== 'admin') builder.andWhere('lead.assigned_to_user_id = :assignedToUserId', { assignedToUserId: user.userId });
    if (query.status) builder.andWhere('lead.status = :status', { status: query.status });
    if (query.keyword?.trim()) builder.andWhere('(lead.name LIKE :keyword OR lead.contact LIKE :keyword OR lead.email LIKE :keyword OR lead.phone LIKE :keyword OR lead.company LIKE :keyword OR lead.product_name LIKE :keyword OR lead.requirements LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    const [items, total] = await builder.orderBy('lead.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    return pageResult(items, total, query);
  }

  async leadAssignees(user: AuthUser) {
    const members = await this.teamRepository.find({ where: { siteId: user.siteId }, order: { joinedAt: 'ASC' } });
    const eligible = members.filter(member => member.userId && (member.role !== 'admin'
      || (user.role === 'admin' && member.userId === user.userId)));
    if (user.role === 'admin' && !eligible.some(member => member.userId === user.userId)) eligible.unshift(this.teamRepository.create({ userId: user.userId, siteId: user.siteId, tenantId: user.tenantId, name: '管理员', role: 'admin', avatar: '', color: '' }));
    return { currentUserId: user.userId, members: eligible.map(member => ({ userId: member.userId!, name: member.role === 'admin' ? '管理员' : member.name, role: member.role })) };
  }

  async updateLead(id: string, dto: UpdateInquiryLeadDto, user: AuthUser) {
    const lead = await this.leadRepository.findOne({ where: { id, siteId: user.siteId } });
    if (!lead) throw new NotFoundException('线索不存在');
    const startingFollow = lead.status === 'new' && dto.status === 'following';
    const changingAssignee = !!dto.assigneeUserId && dto.assigneeUserId !== lead.assignedToUserId;
    const assignmentAction = changingAssignee || (startingFollow && !lead.assignedToUserId);
    const canAssign = (user.permissions || []).includes('storefront.lead.assign');
    const canManage = (user.permissions || []).includes('storefront.lead.manage');
    if (user.role !== 'admin' && lead.assignedToUserId !== user.userId) throw new ForbiddenException('只能处理指派给自己的线索');
    if (assignmentAction && !canAssign) throw new ForbiddenException('当前账号无跟进和指派权限');
    if (startingFollow && !canAssign && !canManage) throw new ForbiddenException('当前账号无跟进线索权限');
    if (!startingFollow && !assignmentAction && !canManage) throw new ForbiddenException('当前账号无跟进和处理线索权限');
    if (lead.status === 'closed' && dto.status !== 'closed') throw new BadRequestException('已关闭线索不可重新流转');
    if (dto.status === 'closed' && !['new', 'following'].includes(lead.status)) throw new BadRequestException('只有新线索或跟进中的线索可以关闭');
    const note = dto.note?.trim() || '';
    if (dto.status !== lead.status && ['following', 'converted'].includes(dto.status) && !note) throw new BadRequestException('请填写备注信息');
    if (dto.status === 'closed' && !dto.closeReason?.trim()) throw new BadRequestException('请填写关闭原因');
    if (dto.status === 'following' && (assignmentAction || !lead.assignedToUserId)) {
      const assigneeUserId = dto.assigneeUserId || lead.assignedToUserId || user.userId;
      const assigningAdminToSelf = user.role === 'admin' && assigneeUserId === user.userId;
      const assignee = assigningAdminToSelf
        ? null
        : await this.teamRepository.findOne({ where: { userId: assigneeUserId, siteId: user.siteId } });
      const eligible = assigningAdminToSelf || (assignee && assignee.role !== 'admin');
      if (!eligible) throw new BadRequestException('普通成员不能将线索指派给管理员');
      lead.assignedToUserId = assigneeUserId;
      lead.assignedToName = assigningAdminToSelf ? '管理员' : assignee!.name;
    }
    lead.status = dto.status;
    if (dto.note !== undefined) lead.note = note || null;
    if (dto.status === 'closed') lead.closeReason = dto.closeReason!.trim();
    return this.leadRepository.save(lead);
  }

  async createLead(hostname: string, siteSlug: string | undefined, dto: CreateInquiryLeadDto) {
    const site = await this.siteService.resolvePublicSite(hostname, siteSlug);
    return this.saveLead(dto, site.tenantId, site.id);
  }

  async createManagedLead(dto: CreateInquiryLeadDto, tenantId: string, siteId: string, user?: AuthUser) {
    const member = user ? await this.teamRepository.findOne({ where: { userId: user.userId, siteId } }) : null;
    return this.saveLead(dto, tenantId, siteId, user, user?.role === 'admin' ? '管理员' : member?.name || user?.account || '');
  }

  private saveLead(dto: CreateInquiryLeadDto, tenantId: string, siteId: string, user?: AuthUser, assignedToName = '') {
    return this.leadRepository.save(this.leadRepository.create({
      tenantId, siteId, type: dto.type || 'inquiry', status: 'new',
      name: dto.name.trim(), contact: (dto.contact || dto.email || dto.phone || '').trim(), email: dto.email?.trim() || '', company: dto.company?.trim() || '',
      phone: dto.phone?.trim() || '', country: dto.country?.trim() || '', productId: dto.productId || null,
      productName: dto.productName?.trim() || '', sourcePage: dto.sourcePage?.trim() || '', requirements: dto.requirements.trim(), note: null,
      assignedToUserId: user?.userId || null, assignedToName, closeReason: null,
    }));
  }

  // ---- Featured Products ----
  async getFeaturedProducts(): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: 'published' },
      order: { createdAt: 'DESC' },
      take: 6,
    });
  }

}
