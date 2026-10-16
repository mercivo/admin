import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppConfig } from './app-config.entity';
import { TeamMember } from './team-member.entity';
import { CreateTeamMemberDto, UpdateSiteInfoDto, UpdateSiteLanguagesDto, UpdateTeamMemberDto } from './workspace.dto';
import { UpdateAccountSettingsDto } from './workspace.dto';
import { User } from '../auth/user.entity';
import { Tenant } from '../site/tenant.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { hashPassword } from '../auth/password.util';
import { AuthUser } from '../../common/types/auth-user';
import { PERMISSION_CATALOG, withPermissionParents } from '../system/permission-catalog';
import { Product } from '../product/product.entity';
import { Warehouse } from '../inventory/inventory.entity';
import { SalesOrder } from '../sales/sales.entity';
import { PurchaseOrder } from '../purchase/purchase.entity';
import { StorefrontInquiryLead } from '../storefront/inquiry-lead.entity';
import { ensureSiteEditorPages } from '../site/site-editor-defaults';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(AppConfig) private readonly configRepo: Repository<AppConfig>,
    @InjectRepository(TeamMember) private readonly teamRepo: Repository<TeamMember>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly domainRepo: Repository<SiteDomain>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Warehouse) private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StorefrontInquiryLead) private readonly leadRepo: Repository<StorefrontInquiryLead>,
  ) {}

  private async optionalConfig<T extends Record<string, unknown>>(key: string, siteId: string, fallback: T): Promise<T> {
    const config = await this.configRepo.findOne({ where: { key: `${siteId}:${key}` } });
    return { ...fallback, ...(config?.value || {}) } as T;
  }

  async getSettings(userId: string, tenantId: string, siteId: string) {
    const [user, tenant, site, domain, account, teamMember, siteMeta, products, members, warehouses] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId, tenantId } }),
      this.tenantRepo.findOne({ where: { id: tenantId } }),
      this.siteRepo.findOne({ where: { id: siteId, tenantId } }),
      this.domainRepo.findOne({ where: { siteId, isPrimary: true, status: 'active' } }),
      this.optionalConfig('account', siteId, { email: '', timezone: 'Asia/Shanghai', twoFactorEnabled: false }),
      this.teamRepo.findOne({ where: { userId } }),
      this.optionalConfig('site-meta', siteId, { description: '外贸 ERP 与独立站平台', logoUrl: '' }),
      this.productRepo.count({ where: { tenantId } }),
      this.userRepo.count({ where: { tenantId } }),
      this.warehouseRepo.count({ where: { tenantId } }),
    ]);
    if (!user || !tenant || !site) throw new NotFoundException('账号或站点不存在');
    const tenantPermissions = tenant.permissions || [];
    const effectivePermissions = user.role === 'admin'
      ? tenantPermissions
      : (user.permissions || []).filter(permission => tenantPermissions.includes(permission));
    return {
      account: { enterpriseName: tenant.name, memberName: teamMember?.name || '', phone: user.phone || '', email: user.role === 'member' ? teamMember?.email || '' : account.email || '', timezone: 'Asia/Shanghai', role: user.role, joinedAt: user.createdAt },
      site: { id: site.id, slug: site.slug, name: site.name, description: siteMeta.description || '外贸 ERP 与独立站平台', logoUrl: siteMeta.logoUrl || '', defaultLanguage: site.defaultLanguage, supportedLanguages: site.supportedLanguages || [site.defaultLanguage], defaultCurrency: site.defaultCurrency, domain: domain?.hostname || '', domainStatus: domain?.sslStatus || 'unconfigured', status: site.status },
      billing: {
        plan: tenant.plan,
        status: tenant.status,
        expiresAt: tenant.expiresAt,
        limits: { products: tenant.maxProducts, members: tenant.maxMembers, warehouses: tenant.maxWarehouses },
        usage: { products, members, warehouses },
        sitePublishing: effectivePermissions.includes('site.publish'),
        features: tenant.features || {},
        permissions: effectivePermissions,
      },
    };
  }

  async updateAccount(dto: UpdateAccountSettingsDto, userId: string, tenantId: string, siteId: string) {
    const [user, tenant, teamMember] = await Promise.all([this.userRepo.findOne({ where: { id: userId, tenantId } }), this.tenantRepo.findOne({ where: { id: tenantId } }), this.teamRepo.findOne({ where: { userId } })]);
    if (!user || !tenant) throw new NotFoundException('账号不存在');
    if (user.role === 'member') {
      if (!teamMember) throw new NotFoundException('成员资料不存在');
      const email = dto.email?.trim() || null;
      if (email && email !== teamMember.email && await this.teamRepo.exists({ where: { email } })) throw new ConflictException('该邮箱已被团队成员使用');
      teamMember.name = dto.memberName?.trim() || teamMember.name;
      teamMember.email = email;
      await this.teamRepo.save(teamMember);
    } else {
      tenant.name = dto.enterpriseName.trim();
      await Promise.all([this.tenantRepo.save(tenant), this.configRepo.save({ key: `${siteId}:account`, value: { email: dto.email?.trim() || '', timezone: 'Asia/Shanghai' } })]);
    }
    return this.getSettings(userId, tenantId, siteId);
  }

  async updateSiteInfo(dto: UpdateSiteInfoDto, tenantId: string, siteId: string) {
    const site = await this.siteRepo.findOne({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('站点不存在');
    site.name = dto.name.trim();
    await Promise.all([this.siteRepo.save(site), this.configRepo.save({ key: `${siteId}:site-meta`, value: { description: dto.description?.trim() || '', logoUrl: dto.logoUrl?.trim() || '' } })]);
    return site;
  }

  async updateSiteLanguages(dto: UpdateSiteLanguagesDto, tenantId: string, siteId: string) {
    const site = await this.siteRepo.findOne({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('站点不存在');
    const supportedLanguages = dto.supportedLanguages || site.supportedLanguages || [dto.defaultLanguage];
    if (!supportedLanguages.includes(dto.defaultLanguage)) throw new BadRequestException('支持语言必须包含站点默认语言');
    site.defaultLanguage = dto.defaultLanguage;
    site.supportedLanguages = supportedLanguages;
    return this.siteRepo.save(site);
  }

  async getSiteContact(siteId: string) {
    const editor = await this.optionalConfig<Record<string, any>>('siteEditor', siteId, {});
    return (editor.siteInfo || {}) as Record<string, unknown>;
  }

  async updateSiteContact(siteInfo: Record<string, unknown>, siteId: string) {
    const editor = await this.optionalConfig<Record<string, any>>('siteEditor', siteId, {});
    const pages = Object.fromEntries(Object.entries((editor.pages || {}) as Record<string, any>).map(([key, page]) => [key, { ...page, sections: (page.sections || []).map((section: any) => section.type === 'contactModal' ? { ...section, title: siteInfo.contactModalTitle, subtitle: siteInfo.contactModalSubtitle } : section) }]));
    const saved = await this.configRepo.save({ key: `${siteId}:siteEditor`, value: { ...editor, siteInfo, ...(editor.pages ? { pages } : {}) } });
    return (saved.value as Record<string, unknown>).siteInfo || {};
  }

  async getConfig(key: string, siteId: string) {
    if (!['seo', 'siteEditor', 'sales', 'currency', 'system'].includes(key)) throw new BadRequestException('不支持的配置项');
    const scopedKey = `${siteId}:${key}`;
    let config = await this.configRepo.findOne({ where: { key: scopedKey } });
    if (!config) {
      const legacy = await this.configRepo.findOne({ where: { key } });
      if (legacy) config = await this.configRepo.save({ key: scopedKey, value: legacy.value });
    }
    if (!config && key === 'currency') {
      const legacySales = await this.configRepo.findOne({ where: { key: `${siteId}:sales` } });
      if (legacySales) config = await this.configRepo.save({ key: scopedKey, value: legacySales.value });
    }
    if (!config && key === 'seo') {
      config = await this.configRepo.save({ key: scopedKey, value: { title: '', description: '', keywords: '' } });
    }
    if (!config && key === 'siteEditor') {
      config = await this.configRepo.save({ key: scopedKey, value: {} });
    }
    if (!config && (key === 'sales' || key === 'currency')) {
      config = await this.configRepo.save({ key: scopedKey, value: { defaultCurrency: 'CNY', purchaseDefaultCurrency: 'CNY', salesDefaultCurrency: 'BAM', currencies: [{ code: 'CNY', name: '人民币', symbol: '¥', enabled: true }, { code: 'BAM', name: '波黑可兑换马克', symbol: 'KM', enabled: true }, { code: 'USD', name: '美元', symbol: '$', enabled: true }, { code: 'EUR', name: '欧元', symbol: '€', enabled: true }] } });
    }
    if (!config && key === 'system') {
      config = await this.configRepo.save({ key: scopedKey, value: { inventoryWarning: { enabled: true, threshold: 10 }, storefront: { guestAccessEnabled: true, guestPriceMode: 'base', guestPricePercentage: 100 } } });
    }
    if (!config) throw new NotFoundException(`Config ${key} not found`);
    if (key === 'currency' || key === 'sales') {
      const value = config.value as any;
      const currencies = Array.isArray(value.currencies) ? [...value.currencies] : [];
      if (!currencies.some((item: any) => item.code === 'BAM')) currencies.push({ code: 'BAM', name: '波黑可兑换马克', symbol: 'KM', enabled: true });
      return { ...value, currencies, purchaseDefaultCurrency: value.purchaseDefaultCurrency || (currencies.some((item: any) => item.enabled && item.code === 'CNY') ? 'CNY' : value.defaultCurrency), salesDefaultCurrency: value.salesDefaultCurrency || (currencies.some((item: any) => item.enabled && item.code === 'BAM') ? 'BAM' : value.defaultCurrency) };
    }
    if (key === 'siteEditor') {
      const normalized = ensureSiteEditorPages(config.value as Record<string, any>);
      if (!(config.value as Record<string, any>)?.pages) config = await this.configRepo.save({ key: scopedKey, value: normalized });
      return normalized;
    }
    return config.value;
  }
  async updateConfig(key: string, value: Record<string, unknown>, siteId: string) {
    if (!['seo', 'siteEditor', 'sales', 'currency', 'system'].includes(key)) throw new BadRequestException('不支持的配置项');
    if (key === 'currency' || key === 'sales') {
      const currencies = Array.isArray(value.currencies) ? value.currencies as Array<Record<string, unknown>> : [];
      const normalized = currencies.map(item => ({ code: String(item.code || '').trim().toUpperCase(), name: String(item.name || '').trim(), symbol: String(item.symbol || '').trim(), enabled: item.enabled === true }));
      if (!normalized.length || normalized.some(item => !/^[A-Z]{3}$/.test(item.code) || !item.name || !item.symbol) || new Set(normalized.map(item => item.code)).size !== normalized.length || !normalized.some(item => item.enabled)) throw new BadRequestException('通用币种配置不合法');
      const requestedDefault = String(value.defaultCurrency || '').toUpperCase();
      const defaultCurrency = normalized.some(item => item.enabled && item.code === requestedDefault) ? requestedDefault : normalized.find(item => item.enabled)!.code;
      const purchaseDefaultCurrency = String(value.purchaseDefaultCurrency || defaultCurrency).toUpperCase();
      const salesDefaultCurrency = String(value.salesDefaultCurrency || defaultCurrency).toUpperCase();
      if (![purchaseDefaultCurrency, salesDefaultCurrency].every(code => normalized.some(item => item.enabled && item.code === code))) throw new BadRequestException('采购和销售默认币种必须处于启用状态');
      const current = await this.getConfig(key, siteId) as any;
      const disabled: string[] = (current.currencies || []).filter((item: any) => item.enabled && !normalized.some(next => next.enabled && next.code === item.code)).map((item: any) => String(item.code));
      if (disabled.length) {
        const [products, salesCurrencies, purchaseCurrencies] = await Promise.all([
          this.productRepo.find({ where: { siteId } }),
          this.configRepo.manager.getRepository(SalesOrder).createQueryBuilder('orders').select('DISTINCT orders.currency', 'currency').where('orders.site_id = :siteId', { siteId }).getRawMany(),
          this.configRepo.manager.getRepository(PurchaseOrder).createQueryBuilder('orders').select('DISTINCT orders.currency', 'currency').where('orders.site_id = :siteId', { siteId }).getRawMany(),
        ]);
        const orderCurrencies = new Set([...salesCurrencies, ...purchaseCurrencies].map(row => String(row.currency)));
        const used = disabled.filter(code => products.some(product => !!product.currencyPrices?.[code]) || orderCurrencies.has(code));
        if (used.length) throw new BadRequestException(`币种 ${used.join('、')} 仍被站点或商品价格使用，无法停用`);
      }
      value = { currencies: normalized, defaultCurrency, purchaseDefaultCurrency, salesDefaultCurrency };
    }
    if (key === 'system') {
      const inventory = value.inventoryWarning as Record<string, unknown> | undefined;
      const storefront = value.storefront as Record<string, unknown> | undefined;
      const threshold = Number(inventory?.threshold);
      const percentage = Number(storefront?.guestPricePercentage);
      if (!inventory || typeof inventory.enabled !== 'boolean' || !Number.isInteger(threshold) || threshold < 0 || threshold > 999999) throw new BadRequestException('库存预警配置不合法');
      if (!storefront || typeof storefront.guestAccessEnabled !== 'boolean' || !['base', 'hidden', 'percentage'].includes(String(storefront.guestPriceMode)) || !Number.isFinite(percentage) || percentage < 0 || percentage > 1000) throw new BadRequestException('游客访问配置不合法');
      value = { inventoryWarning: { enabled: inventory.enabled, threshold }, storefront: { guestAccessEnabled: storefront.guestAccessEnabled, guestPriceMode: storefront.guestPriceMode, guestPricePercentage: percentage } };
    }
    const saved = await this.configRepo.save({ key: `${siteId}:${key}`, value });
    if (key === 'currency' || key === 'sales') {
      const config = value as { defaultCurrency: string; currencies: Array<{ code: string; enabled: boolean }> };
      const site = await this.siteRepo.findOne({ where: { id: siteId } });
      if (site && site.defaultCurrency !== config.defaultCurrency) {
        site.defaultCurrency = config.defaultCurrency;
        await this.siteRepo.save(site);
      }
    }
    return saved.value;
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
        avatar: ownerName.slice(-2).toUpperCase(),
        color: 'bg-primary text-white',
      });
    } else {
      owner.name = ownerName;
      owner.role = 'admin';
      owner.avatar = ownerName.slice(-2).toUpperCase();
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
    const allowed = new Set(withPermissionParents(tenant.permissions || []));
    return PERMISSION_CATALOG.filter(item => allowed.has(item.key));
  }
  async createMember(dto: CreateTeamMemberDto, requester: AuthUser) {
    if (requester.role !== 'admin') throw new ForbiddenException('仅商户管理员可添加成员');
    const tenant = await this.tenantRepo.findOne({ where: { id: requester.tenantId } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (await this.userRepo.count({ where: { tenantId: requester.tenantId } }) >= tenant.maxMembers) throw new ForbiddenException(`当前套餐最多支持 ${tenant.maxMembers} 位成员`);
    if (await this.userRepo.exists({ where: { phone: dto.phone } })) throw new ConflictException('该手机号已是系统账号');
    const email = dto.email?.trim().toLowerCase() || null;
    if (email && await this.teamRepo.exists({ where: { email } })) throw new ConflictException('该邮箱已被团队成员使用');
    const permissions = this.validateMemberPermissions(dto.permissions || [], tenant.permissions || []);
    const user = await this.userRepo.save(this.userRepo.create({ tenantId: requester.tenantId, siteId: requester.siteId, phone: dto.phone, username: null, passwordHash: await hashPassword(dto.password), role: 'member', status: 'active', permissions, lastLoginAt: null }));
    try {
      return await this.teamRepo.save(this.teamRepo.create({ userId: user.id, name: dto.name.trim(), email, phone: dto.phone, role: 'member', permissions, tenantId: requester.tenantId, siteId: requester.siteId, avatar: dto.avatar || dto.name.slice(-2).toUpperCase(), color: dto.color || 'bg-gray-500 text-white' }));
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
    if (dto.phone && dto.phone !== user.phone && await this.userRepo.exists({ where: { phone: dto.phone } })) throw new ConflictException('该手机号已是系统账号');
    const email = dto.email === undefined ? member.email : dto.email.trim().toLowerCase() || null;
    if (email && email !== member.email && await this.teamRepo.exists({ where: { email } })) throw new ConflictException('该邮箱已被团队成员使用');
    Object.assign(user, { role: 'member', permissions, ...(dto.phone ? { phone: dto.phone } : {}) });
    Object.assign(member, { ...dto, name: dto.name?.trim() || member.name, email, phone: dto.phone || member.phone, role: 'member', permissions });
    await this.userRepo.save(user);
    return this.teamRepo.save(member);
  }
  async deleteMember(id: string, requester: AuthUser) {
    if (requester.role !== 'admin') throw new ForbiddenException('仅商户管理员可移除成员');
    const member = await this.teamRepo.findOne({ where: { id, siteId: requester.siteId } });
    if (!member) return;
    if (!member.userId || member.userId === requester.userId) throw new ForbiddenException('不能移除商户管理员');
    await this.leadRepo.update(
      { siteId: requester.siteId, assignedToUserId: member.userId, status: In(['new', 'following']) },
      { status: 'new', assignedToUserId: null, assignedToName: '' },
    );
    await this.teamRepo.remove(member);
    await this.userRepo.delete({ id: member.userId, tenantId: requester.tenantId });
  }
  private validateMemberPermissions(requested: string[], tenantPermissions: string[]) {
    const known = new Set(PERMISSION_CATALOG.map(item => item.key));
    const invalidUnknown = requested.find(key => !known.has(key));
    if (invalidUnknown) throw new ForbiddenException('成员权限不能超出商户权限范围');
    const normalized = withPermissionParents(requested);
    const allowed = new Set(withPermissionParents(tenantPermissions));
    const invalid = normalized.find(key => !allowed.has(key));
    if (invalid) throw new ForbiddenException('成员权限不能超出商户权限范围');
    return normalized;
  }
}
