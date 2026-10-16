import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../site/tenant.entity';
import { Product } from '../product/product.entity';
import { User } from '../auth/user.entity';
import { CreateTenantDto, SavePlanDto, UpdateTenantControlDto } from './system.dto';
import { Plan } from './plan.entity';
import { SubscriptionOrder } from './subscription-order.entity';
import { PERMISSION_CATALOG, TRIAL_PERMISSIONS, withPermissionParents } from './permission-catalog';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { Customer } from '../customer/customer.entity';
import { randomUUID } from 'crypto';
import { Warehouse } from '../inventory/inventory.entity';
import { pageLimit, pageOffset, pageResult } from '../../common/dto/page-query.dto';
import { SystemListQueryDto } from './system-query.dto';
import { hashPassword } from '../auth/password.util';
import { TeamMember } from '../workspace/team-member.entity';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(SubscriptionOrder) private readonly orders: Repository<SubscriptionOrder>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly siteDomains: Repository<SiteDomain>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
  ) {}

  async overview() {
    const [totalTenants, activeTenants, suspendedTenants, totalProducts, totalCustomers, totalUsers] = await Promise.all([
      this.tenants.count(), this.tenants.count({ where: { status: 'active' } }), this.tenants.count({ where: { status: 'suspended' } }),
      this.products.count(), this.customers.count(), this.users.count({ where: { role: 'admin' } }),
    ]);
    return { totalTenants, activeTenants, suspendedTenants, totalProducts, totalCustomers, totalUsers };
  }

  async analytics() {
    const now = new Date();
    const warningAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [tenants, plans, tenantUsage, sites, publishedSites, verifiedDomains, customers, orders] = await Promise.all([
      this.tenants.find({ order: { createdAt: 'ASC' } }), this.plans.find({ order: { sortOrder: 'ASC' } }), this.enrichTenants(await this.tenants.find({ order: { createdAt: 'DESC' } })),
      this.sites.count(), this.sites.count({ where: { status: 'published' } }),
      this.siteDomains.createQueryBuilder('domain').where('domain.verified_at IS NOT NULL').getCount(),
      this.customers.count(), this.orders.find(),
    ]);
    const monthMap = new Map<string, number>();
    tenants.forEach(tenant => {
      const date = new Date(tenant.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });
    const growthStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const tenantsBeforeWindow = tenants.filter(tenant => new Date(tenant.createdAt) < growthStart).length;
    let cumulative = tenantsBeforeWindow;
    const tenantGrowth = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(growthStart.getFullYear(), growthStart.getMonth() + index, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const count = monthMap.get(month) || 0;
      cumulative += count;
      return { month, count, cumulative };
    });
    const planName = new Map(plans.map(plan => [plan.code, plan.name]));
    const planCounts = new Map<string, number>();
    tenants.forEach(tenant => planCounts.set(tenant.plan, (planCounts.get(tenant.plan) || 0) + 1));
    const planDistribution = [...planCounts.entries()].map(([plan, count]) => ({ plan, name: planName.get(plan) || plan, count }));
    const customQuotaTenants = tenantUsage.filter(tenant => tenant.quotaMode === 'custom').length;
    const quotaWarningTenants = tenantUsage.filter(tenant => tenant.usage.products / Math.max(tenant.maxProducts, 1) >= 0.8 || tenant.usage.users / Math.max(tenant.maxMembers, 1) >= 0.8).length;
    const avg = (field: 'products' | 'users', quota: 'maxProducts' | 'maxMembers') => tenants.length
      ? Math.round(tenantUsage.reduce((sum, tenant) => sum + Math.min(tenant.usage[field] / Math.max(tenant[quota], 1), 1), 0) / tenants.length * 100) : 0;
    const permissionDemand = PERMISSION_CATALOG.map(item => ({ key: item.key, label: item.label, group: item.group, enabledTenants: tenants.filter(tenant => (tenant.permissions || []).includes(item.key)).length })).sort((a, b) => b.enabledTenants - a.enabledTenants);
    const topTenants = tenantUsage.map(tenant => ({
      id: tenant.id, name: tenant.name, planName: planName.get(tenant.plan) || tenant.plan,
      products: tenant.usage.products, customers: tenant.usage.customers, members: tenant.usage.users, sites: tenant.usage.sites,
      activityScore: tenant.usage.products + tenant.usage.customers * 2 + tenant.usage.users * 3,
    })).sort((a, b) => b.activityScore - a.activityScore).slice(0, 10);
    const confirmedOrders = orders.filter(order => order.status === 'confirmed');
    const paidPlanCodes = new Set(plans.filter(plan => Number(plan.price) > 0).map(plan => plan.code));
    const paidTenants = tenants.filter(tenant => paidPlanCodes.has(tenant.plan)).length;
    const atRiskTenantIds = new Set(tenants.filter(tenant => tenant.status === 'suspended'
      || Boolean(tenant.expiresAt && new Date(tenant.expiresAt) <= warningAt)).map(tenant => tenant.id));
    return {
      lifecycle: { total: tenants.length, active: tenants.filter(t => t.status === 'active').length, suspended: tenants.filter(t => t.status === 'suspended').length, expired: tenants.filter(t => t.expiresAt && new Date(t.expiresAt) < now).length, expiring: tenants.filter(t => t.expiresAt && new Date(t.expiresAt) >= now && new Date(t.expiresAt) <= warningAt).length, atRisk: atRiskTenantIds.size, paidTenants },
      business: {
        sites, publishedSites, verifiedDomains, products: tenantUsage.reduce((sum, tenant) => sum + tenant.usage.products, 0), customers,
        members: tenantUsage.reduce((sum, tenant) => sum + tenant.usage.users, 0),
        warehouses: tenantUsage.reduce((sum, tenant) => sum + tenant.usage.warehouses, 0),
        confirmedOrders: confirmedOrders.length,
      },
      utilization: { products: avg('products', 'maxProducts'), members: avg('users', 'maxMembers'), quotaWarningTenants },
      customization: { customQuotaTenants, customPermissionTenants: tenants.filter(t => t.permissionsCustomized).length, permissionDemand },
      tenantGrowth, planDistribution, topTenants,
    };
  }

  async listTenants(query: SystemListQueryDto) {
    const builder = this.tenants.createQueryBuilder('tenant');
    if (query.keyword?.trim()) builder.where(`(
      tenant.name LIKE :keyword OR tenant.slug LIKE :keyword OR EXISTS (
        SELECT 1 FROM users tenant_admin
        WHERE tenant_admin.tenant_id = tenant.id
          AND tenant_admin.role = 'admin'
          AND (tenant_admin.phone LIKE :keyword OR tenant_admin.username LIKE :keyword)
      )
    )`, { keyword: `%${query.keyword.trim()}%` });
    if (query.status) builder.andWhere('tenant.status = :status', { status: query.status });
    const [tenants, total] = await builder.orderBy('tenant.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    const items = await this.enrichTenants(tenants);
    const raw = await this.tenants.createQueryBuilder('tenant').select('COALESCE(SUM(tenant.max_products),0)', 'maxProducts').addSelect('COALESCE(SUM(tenant.max_members),0)', 'maxMembers').addSelect('COALESCE(SUM(tenant.max_warehouses),0)', 'maxWarehouses').getRawOne();
    return { ...pageResult(items, total, query), summary: { maxProducts: Number(raw?.maxProducts || 0), maxMembers: Number(raw?.maxMembers || 0), maxWarehouses: Number(raw?.maxWarehouses || 0) } };
  }

  private async enrichTenants(tenants: Tenant[]) {
    const plans = await this.plans.find();
    const planByCode = new Map(plans.map(plan => [plan.code, plan]));
    return Promise.all(tenants.map(async tenant => {
      const [products, customers, users, sites, warehouses, administrator] = await Promise.all([
        this.products.count({ where: { tenantId: tenant.id } }), this.customers.count({ where: { tenantId: tenant.id } }),
        this.users.count({ where: { tenantId: tenant.id } }), this.sites.count({ where: { tenantId: tenant.id } }), this.warehouses.count({ where: { tenantId: tenant.id } }),
        this.users.findOne({ where: { tenantId: tenant.id, role: 'admin' } }),
      ]);
      const plan = planByCode.get(tenant.plan);
      const defaultQuota = plan ? { maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxWarehouses: plan.maxWarehouses } : null;
      const quotaMode = defaultQuota && tenant.maxProducts === defaultQuota.maxProducts && tenant.maxMembers === defaultQuota.maxMembers && tenant.maxWarehouses === defaultQuota.maxWarehouses ? 'plan' : 'custom';
      return { ...tenant, adminAccount: administrator?.phone || administrator?.username || '-', defaultQuota, quotaMode, defaultPermissions: plan?.permissions || [], permissionMode: tenant.permissionsCustomized ? 'custom' : 'plan', usage: { products, customers, users, sites, warehouses } };
    }));
  }

  async updateTenant(id: string, dto: UpdateTenantControlDto) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (dto.plan && dto.plan !== tenant.plan) {
      const plan = await this.plans.findOne({ where: { code: dto.plan, enabled: true } });
      if (!plan) throw new NotFoundException('套餐不存在或已下架');
      Object.assign(tenant, { plan: plan.code, maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxWarehouses: plan.maxWarehouses, features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false });
    }
    const { expiresAt, ...changes } = dto;
    Object.assign(tenant, changes);
    if (expiresAt) tenant.expiresAt = new Date(expiresAt);
    if (dto.permissions) tenant.permissions = withPermissionParents(dto.permissions);
    return this.tenants.save(tenant);
  }

  async createTenant(dto: CreateTenantDto) {
    if (await this.users.exist({ where: { phone: dto.phone } })) throw new ConflictException('该手机号已注册');
    const plan = await this.plans.findOne({ where: { code: dto.plan, enabled: true } });
    if (!plan) throw new NotFoundException('套餐不存在或已下架');
    const passwordHash = await hashPassword('12345678');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    return this.tenants.manager.transaction(async manager => {
      const tenant = await manager.save(Tenant, manager.create(Tenant, {
        name: dto.name.trim(), slug: `tenant-${suffix}`, status: 'active', plan: plan.code,
        maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxWarehouses: plan.maxWarehouses,
        features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }));
      const site = await manager.save(Site, manager.create(Site, { tenantId: tenant.id, slug: `site-${suffix}`, name: `${tenant.name} 独立站`, status: 'draft', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY', publishedVersionId: null }));
      await manager.save(Warehouse, manager.create(Warehouse, { tenantId: tenant.id, siteId: site.id, code: 'DEFAULT', name: '默认仓库', contact: '', phone: '', address: '', status: 'active', isDefault: true }));
      const user = await manager.save(User, manager.create(User, { tenantId: tenant.id, siteId: site.id, phone: dto.phone, username: null, passwordHash, role: 'admin', permissions: null, status: 'active', lastLoginAt: null }));
      await manager.save(TeamMember, manager.create(TeamMember, { userId: user.id, tenantId: tenant.id, siteId: site.id, name: tenant.name, email: null, phone: dto.phone, role: 'admin', permissions: null, avatar: '', color: 'bg-indigo-600 text-white' }));
      return { tenant, account: dto.phone, initialPassword: '12345678' };
    });
  }

  async resetTenantPassword(id: string) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('商户不存在');
    const user = await this.users.findOne({ where: { tenantId: id, role: 'admin' } });
    if (!user) throw new NotFoundException('租户管理员账号不存在');
    user.passwordHash = await hashPassword('12345678');
    await this.users.save(user);
    return { success: true, account: user.phone || user.username, initialPassword: '12345678' };
  }

  permissionCatalog() { return PERMISSION_CATALOG; }
  async ensureDefaultPlans() {
    const trial = await this.plans.findOne({ where: { code: 'trial' } });
    if (!trial) {
      await this.plans.save(this.plans.create({ code: 'trial', name: '试用版', price: 0, maxProducts: 20, maxMembers: 1, maxWarehouses: 1, features: {}, permissions: TRIAL_PERMISSIONS, sortOrder: 0, currency: 'CNY', billingCycle: 'month', enabled: true, description: '可完整编辑并保存站点草稿，不支持发布' }));
    }
    const standard = await this.plans.findOne({ where: { code: 'standard' } });
    const fullPermissions = withPermissionParents(PERMISSION_CATALOG.map(item => item.key));
    if (!standard) await this.plans.save(this.plans.create({ code: 'standard', name: '标准版', price: 1680, maxProducts: 50, maxMembers: 5, maxWarehouses: 3, features: {}, permissions: fullPermissions, sortOrder: 10, currency: 'CNY', billingCycle: 'year', enabled: true, description: '适用于成长型外贸团队，包含全部功能权限' }));
  }
  async listPlans(enabledOnly = true) { await this.ensureDefaultPlans(); return this.plans.find({ where: enabledOnly ? { enabled: true } : {}, order: { sortOrder: 'ASC', price: 'ASC' } }); }
  async createPlan(dto: SavePlanDto) {
    let code = `plan-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    while (await this.plans.exist({ where: { code } })) code = `plan-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    return this.plans.save(this.plans.create({ ...dto, code, maxWarehouses: dto.maxWarehouses || 1, permissions: withPermissionParents(dto.permissions || []) }));
  }
  async updatePlan(id: string, dto: SavePlanDto) {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('套餐不存在');
    const previousQuota = { maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxWarehouses: plan.maxWarehouses };
    Object.assign(plan, dto, { permissions: withPermissionParents(dto.permissions || []) });
    const saved = await this.plans.save(plan);
    const planTenants = await this.tenants.find({ where: { plan: saved.code } });
    const inherited = new Set(planTenants.filter(t => t.maxProducts === previousQuota.maxProducts && t.maxMembers === previousQuota.maxMembers && t.maxWarehouses === previousQuota.maxWarehouses).map(t => t.id));
    const changed = planTenants.filter(t => inherited.has(t.id) || !t.permissionsCustomized);
    if (changed.length) await this.tenants.save(changed.map(t => this.tenants.merge(t, { ...(inherited.has(t.id) ? { maxProducts: saved.maxProducts, maxMembers: saved.maxMembers, maxWarehouses: saved.maxWarehouses, features: saved.features || {} } : {}), ...(!t.permissionsCustomized ? { permissions: saved.permissions || [] } : {}) })));
    return saved;
  }
  async deletePlan(id: string) { const plan = await this.plans.findOne({ where: { id } }); if (!plan) throw new NotFoundException('套餐不存在'); plan.enabled = false; return this.plans.save(plan); }
  async listOrders(query: SystemListQueryDto) {
    const builder = this.orders.createQueryBuilder('orders');
    if (query.keyword?.trim()) builder.where('(orders.order_no LIKE :keyword OR orders.plan_name LIKE :keyword)', { keyword: `%${query.keyword.trim()}%` });
    if (query.status) builder.andWhere('orders.status = :status', { status: query.status });
    const [items, total] = await builder.orderBy('orders.created_at', 'DESC').skip(pageOffset(query)).take(pageLimit(query)).getManyAndCount();
    return pageResult(items, total, query);
  }
  async subscribe(tenantId: string, planId: string) {
    const [tenant, plan] = await Promise.all([this.tenants.findOne({ where: { id: tenantId } }), this.plans.findOne({ where: { id: planId, enabled: true } })]);
    if (!tenant) throw new NotFoundException('商户不存在');
    if (!plan) throw new NotFoundException('套餐不存在或已下架');
    const effectiveAt = new Date(); const expiresAt = new Date(effectiveAt);
    if (plan.billingCycle === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + 1); else expiresAt.setMonth(expiresAt.getMonth() + 1);
    Object.assign(tenant, { plan: plan.code, maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxWarehouses: plan.maxWarehouses, features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false, expiresAt, status: 'active' });
    const order = this.orders.create({ orderNo: `SUB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`, tenantId, planId: plan.id, planCode: plan.code, planName: plan.name, amount: Number(plan.price), currency: plan.currency, status: 'confirmed', paymentStatus: 'not_required', effectiveAt, expiresAt });
    await this.tenants.save(tenant); await this.orders.save(order); return order;
  }
  async tenantOrders(tenantId: string) { return this.orders.find({ where: { tenantId }, order: { createdAt: 'DESC' } }); }
  private samePermissions(left: string[], right: string[]) {
    return left.length === right.length && left.every(permission => right.includes(permission));
  }
}
