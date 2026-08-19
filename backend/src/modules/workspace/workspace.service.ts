import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './app-config.entity';
import { TeamMember } from './team-member.entity';
import { KnowledgeFile } from './knowledge-file.entity';
import { CreateTeamMemberDto, UpdateTeamMemberDto } from './workspace.dto';
import { UpdateAccountSettingsDto, UpdateSiteSettingsDto } from './workspace.dto';
import { User } from '../auth/user.entity';
import { Tenant } from '../site/tenant.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { hashPassword } from '../auth/password.util';
import { AuthUser } from '../../common/types/auth-user';
import { PERMISSION_CATALOG } from '../system/permission-catalog';
import { CloudStorageService } from '../../common/storage/cloud-storage.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(AppConfig) private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(TeamMember) private readonly teamRepo: Repository<TeamMember>,
    @InjectRepository(KnowledgeFile) private readonly knowledgeRepo: Repository<KnowledgeFile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly domainRepo: Repository<SiteDomain>,
    private readonly storage: CloudStorageService,
  ) {}

  private async optionalConfig<T extends Record<string, unknown>>(key: string, siteId: string, fallback: T): Promise<T> {
    const config = await this.configRepo.findOne({ where: { key: `${siteId}:${key}` } });
    return { ...fallback, ...(config?.value || {}) } as T;
  }

  async getSettings(userId: string, tenantId: string, siteId: string) {
    const [user, tenant, site, domain, account, siteMeta] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId, tenantId } }),
      this.tenantRepo.findOne({ where: { id: tenantId } }),
      this.siteRepo.findOne({ where: { id: siteId, tenantId } }),
      this.domainRepo.findOne({ where: { siteId, isPrimary: true, status: 'active' } }),
      this.optionalConfig('account', siteId, { email: '', timezone: 'Asia/Shanghai', twoFactorEnabled: false }),
      this.optionalConfig('site-meta', siteId, { description: '' }),
    ]);
    if (!user || !tenant || !site) throw new NotFoundException('账号或站点不存在');
    return {
      account: { enterpriseName: tenant.name, phone: user.phone || '', email: account.email || '', timezone: 'Asia/Shanghai', role: user.role, joinedAt: user.createdAt },
      site: { id: site.id, slug: site.slug, name: site.name, description: siteMeta.description || '', defaultLanguage: site.defaultLanguage, defaultCurrency: site.defaultCurrency, domain: domain?.hostname || '', domainStatus: domain?.sslStatus || 'unconfigured', status: site.status },
      billing: { plan: tenant.plan, status: tenant.status, expiresAt: tenant.expiresAt, limits: { products: tenant.maxProducts, agents: tenant.maxAgents, members: tenant.maxMembers }, sitePublishing: (tenant.permissions || []).includes('site.publish'), features: tenant.features || {}, permissions: tenant.permissions || [] },
    };
  }

  async updateAccount(dto: UpdateAccountSettingsDto, userId: string, tenantId: string, siteId: string) {
    const [user, tenant] = await Promise.all([this.userRepo.findOne({ where: { id: userId, tenantId } }), this.tenantRepo.findOne({ where: { id: tenantId } })]);
    if (!user || !tenant) throw new NotFoundException('账号不存在');
    if (await this.userRepo.exists({ where: { phone: dto.phone } }) && user.phone !== dto.phone) throw new ConflictException('该手机号已注册');
    user.phone = dto.phone; tenant.name = dto.enterpriseName.trim();
    await Promise.all([this.userRepo.save(user), this.tenantRepo.save(tenant), this.updateConfig('account', { email: dto.email?.trim() || '', timezone: 'Asia/Shanghai' }, siteId)]);
    return this.getSettings(userId, tenantId, siteId);
  }

  async updateSite(dto: UpdateSiteSettingsDto, tenantId: string, siteId: string) {
    const site = await this.siteRepo.findOne({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('站点不存在');
    site.name = dto.name.trim(); site.defaultLanguage = dto.defaultLanguage; site.defaultCurrency = dto.defaultCurrency;
    await Promise.all([this.siteRepo.save(site), this.updateConfig('site-meta', { description: dto.description?.trim() || '' }, siteId)]);
    return site;
  }

  async getConfig(key: string, siteId: string) {
    if (!['seo', 'siteEditor'].includes(key)) throw new BadRequestException('不支持的配置项');
    const scopedKey = `${siteId}:${key}`;
    let config = await this.configRepo.findOne({ where: { key: scopedKey } });
    if (!config) {
      const legacy = await this.configRepo.findOne({ where: { key } });
      if (legacy) config = await this.configRepo.save({ key: scopedKey, value: legacy.value });
    }
    if (!config && key === 'seo') {
      config = await this.configRepo.save({ key: scopedKey, value: { title: '', description: '', keywords: '' } });
    }
    if (!config && key === 'siteEditor') {
      config = await this.configRepo.save({ key: scopedKey, value: {} });
    }
    if (!config) throw new NotFoundException(`Config ${key} not found`);
    return config.value;
  }
  async updateConfig(key: string, value: Record<string, unknown>, siteId: string) {
    if (!['seo', 'siteEditor'].includes(key)) throw new BadRequestException('不支持的配置项');
    return (await this.configRepo.save({ key: `${siteId}:${key}`, value })).value;
  }
  async listTeam(userId: string, tenantId: string, siteId: string) {
    const [user, tenant, account, ownerUser] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId, tenantId } }),
      this.tenantRepo.findOne({ where: { id: tenantId } }),
      this.optionalConfig('account', siteId, { email: '' }),
      this.userRepo.findOne({ where: { tenantId, role: 'admin' } }),
    ]);
    if (!user || !tenant || !ownerUser) throw new NotFoundException('账号不存在');

    let owner = await this.teamRepo.findOne({ where: { userId: ownerUser.id, siteId } });
    const ownerName = tenant.name.trim();
    if (!owner) {
      owner = this.teamRepo.create({
        userId: ownerUser.id,
        tenantId,
        siteId,
        name: ownerName,
        email: null,
        role: 'admin',
        avatar: ownerName.slice(0, 2).toUpperCase(),
        color: 'bg-primary text-white',
      });
    } else {
      owner.name = ownerName;
      owner.role = 'admin';
      owner.avatar = ownerName.slice(0, 2).toUpperCase();
    }
    owner = await this.teamRepo.save(owner);

    const members = await this.teamRepo.find({ where: { siteId }, order: { joinedAt: 'ASC' } });
    return members.map(member => member.id === owner.id
      ? { ...member, email: String(account.email || ownerUser.username || ''), phone: ownerUser.phone || '', permissions: tenant.permissions || [] }
      : member);
  }
  async teamPermissions(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('商户不存在');
    const allowed = new Set(tenant.permissions || []);
    return PERMISSION_CATALOG.filter(item => allowed.has(item.key));
  }
  async createMember(dto: CreateTeamMemberDto, requester: AuthUser) {
    if (requester.role !== 'admin') throw new ForbiddenException('仅商户管理员可添加成员');
    const tenant = await this.tenantRepo.findOne({ where: { id: requester.tenantId } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (await this.userRepo.count({ where: { tenantId: requester.tenantId } }) >= tenant.maxMembers) throw new ForbiddenException(`当前套餐最多支持 ${tenant.maxMembers} 位成员`);
    if (await this.userRepo.exists({ where: { username: dto.email.toLowerCase() } })) throw new ConflictException('该邮箱已是系统账号');
    const permissions = this.validateMemberPermissions(dto.permissions || [], tenant.permissions || []);
    const user = await this.userRepo.save(this.userRepo.create({ tenantId: requester.tenantId, siteId: requester.siteId, phone: null, username: dto.email.toLowerCase(), passwordHash: await hashPassword(dto.password), role: dto.role === 'admin' ? 'editor' : dto.role, status: 'active', permissions, lastLoginAt: null }));
    try {
      return await this.teamRepo.save(this.teamRepo.create({ userId: user.id, name: dto.name, email: dto.email.toLowerCase(), role: user.role as 'editor' | 'viewer', permissions, tenantId: requester.tenantId, siteId: requester.siteId, avatar: dto.avatar || dto.name.slice(0, 2).toUpperCase(), color: dto.color || 'bg-gray-500 text-white' }));
    } catch (error) { await this.userRepo.remove(user); throw error; }
  }
  async updateMember(id: string, dto: UpdateTeamMemberDto, requester: AuthUser) {
    if (requester.role !== 'admin') throw new ForbiddenException('仅商户管理员可配置成员权限');
    const member = await this.teamRepo.findOne({ where: { id, siteId: requester.siteId } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    if (!member.userId) throw new ForbiddenException('管理员账号不可在此修改');
    const [tenant, user] = await Promise.all([this.tenantRepo.findOne({ where: { id: requester.tenantId } }), this.userRepo.findOne({ where: { id: member.userId, tenantId: requester.tenantId } })]);
    if (!tenant || !user) throw new NotFoundException('成员账号不存在');
    const permissions = dto.permissions === undefined ? member.permissions || [] : this.validateMemberPermissions(dto.permissions, tenant.permissions || []);
    const role = dto.role === 'viewer' ? 'viewer' : 'editor';
    Object.assign(user, { role, permissions }); Object.assign(member, dto, { role, permissions });
    await this.userRepo.save(user);
    return this.teamRepo.save(member);
  }
  async deleteMember(id: string, requester: AuthUser) {
    if (requester.role !== 'admin') throw new ForbiddenException('仅商户管理员可移除成员');
    const member = await this.teamRepo.findOne({ where: { id, siteId: requester.siteId } });
    if (!member) return;
    if (!member.userId || member.userId === requester.userId) throw new ForbiddenException('不能移除商户管理员');
    await this.teamRepo.remove(member);
    await this.userRepo.delete({ id: member.userId, tenantId: requester.tenantId });
  }
  private validateMemberPermissions(requested: string[], tenantPermissions: string[]) {
    const allowed = new Set(tenantPermissions);
    const invalid = requested.find(key => !allowed.has(key));
    if (invalid) throw new ForbiddenException('成员权限不能超出商户权限范围');
    return [...new Set(requested)];
  }
  listKnowledge(siteId: string) { return this.knowledgeRepo.find({ where: { siteId }, order: { createdAt: 'DESC' } }); }
  async createKnowledge(file: Express.Multer.File, tenantId: string, siteId: string) {
    if (!/\.(txt|md|csv|json)$/i.test(file.originalname)) throw new BadRequestException('当前支持 TXT、Markdown、CSV 和 JSON 文本文档');
    const content = file.buffer.toString('utf8').trim();
    if (!content) throw new BadRequestException('知识文档内容不能为空');
    const stored = await this.storage.upload(file, `tenants/${tenantId}/sites/${siteId}/knowledge`, { public: false });
    try {
      return await this.knowledgeRepo.save(this.knowledgeRepo.create({
        name: file.originalname,
        type: file.originalname.split('.').pop()?.toUpperCase() || 'TXT',
        size: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
        content: '', objectName: stored.objectName, tenantId, siteId,
        status: 'indexed', chunks: Math.max(1, Math.ceil(content.length / 1200)),
      }));
    } catch (error) {
      await this.storage.delete(stored.objectName, { public: false });
      throw error;
    }
  }
  async deleteKnowledge(id: string, siteId: string) {
    const item = await this.knowledgeRepo.findOne({ where: { id, siteId } });
    if (!item) return;
    await this.knowledgeRepo.remove(item);
    if (item.objectName) await this.storage.delete(item.objectName, { public: false });
  }
}
