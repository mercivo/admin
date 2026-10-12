import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../site/tenant.entity';
import { Product } from '../product/product.entity';
import { User } from '../auth/user.entity';
import { SavePlanDto, UpdateTenantControlDto } from './system.dto';
import { Plan } from './plan.entity';
import { SubscriptionOrder } from './subscription-order.entity';
import { PERMISSION_CATALOG, TRIAL_PERMISSIONS, withPermissionParents } from './permission-catalog';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { Customer } from '../customer/customer.entity';
import { randomUUID } from 'crypto';
import { Warehouse } from '../inventory/inventory.entity';

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
      this.tenants.find({ order: { createdAt: 'ASC' } }), this.plans.find({ order: { sortOrder: 'ASC' } }), this.listTenants(),
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
    let cumulative = 0;
    const tenantGrowth = [...monthMap.entries()].map(([month, count]) => ({ month, count, cumulative: cumulative += count })).slice(-12);
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
    const confirmedRevenue = orders.filter(order => order.status === 'confirmed').reduce((sum, order) => sum + Number(order.amount), 0);
    return {
      lifecycle: { total: tenants.length, active: tenants.filter(t => t.status === 'active').length, suspended: tenants.filter(t => t.status === 'suspended').length, expired: tenants.filter(t => t.expiresAt && new Date(t.expiresAt) < now).length, expiring: tenants.filter(t => t.expiresAt && new Date(t.expiresAt) >= now && new Date(t.expiresAt) <= warningAt).length },
      business: { sites, publishedSites, verifiedDomains, products: tenantUsage.reduce((sum, tenant) => sum + tenant.usage.products, 0), customers, confirmedRevenue },
      utilization: { products: avg('products', 'maxProducts'), members: avg('users', 'maxMembers'), quotaWarningTenants },
      customization: { customQuotaTenants, customPermissionTenants: tenants.filter(t => t.permissionsCustomized).length, permissionDemand },
      tenantGrowth, planDistribution, topTenants,
    };
  }

  async listTenants() {
    const [tenants, plans] = await Promise.all([this.tenants.find({ order: { createdAt: 'DESC' } }), this.plans.find()]);
    const planByCode = new Map(plans.map(plan => [plan.code, plan]));
    return Promise.all(tenants.map(async tenant => {
      const [products, customers, users, sites, warehouses] = await Promise.all([
        this.products.count({ where: { tenantId: tenant.id } }), this.customers.count({ where: { tenantId: tenant.id } }),
        this.users.count({ where: { tenantId: tenant.id } }), this.sites.count({ where: { tenantId: tenant.id } }), this.warehouses.count({ where: { tenantId: tenant.id } }),
      ]);
      const plan = planByCode.get(tenant.plan);
      const defaultQuota = plan ? { maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxSites: plan.maxSites, maxWarehouses: plan.maxWarehouses } : null;
      const quotaMode = defaultQuota && tenant.maxProducts === defaultQuota.maxProducts && tenant.maxMembers === defaultQuota.maxMembers && tenant.maxSites === defaultQuota.maxSites && tenant.maxWarehouses === defaultQuota.maxWarehouses ? 'plan' : 'custom';
      return { ...tenant, defaultQuota, quotaMode, defaultPermissions: plan?.permissions || [], permissionMode: tenant.permissionsCustomized ? 'custom' : 'plan', usage: { products, customers, users, sites, warehouses } };
    }));
  }

  async updateTenant(id: string, dto: UpdateTenantControlDto) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (dto.plan && dto.plan !== tenant.plan) {
      const plan = await this.plans.findOne({ where: { code: dto.plan, enabled: true } });
      if (!plan) throw new NotFoundException('套餐不存在或已下架');
      Object.assign(tenant, { plan: plan.code, maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxSites: plan.maxSites, maxWarehouses: plan.maxWarehouses, features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false });
    }
    const { expiresAt, ...changes } = dto;
    Object.assign(tenant, changes);
    if (expiresAt) tenant.expiresAt = new Date(expiresAt);
    if (dto.permissions) tenant.permissions = withPermissionParents(dto.permissions);
    return this.tenants.save(tenant);
  }

  permissionCatalog() { return PERMISSION_CATALOG; }
  async ensureDefaultPlans() {
    const trial = await this.plans.findOne({ where: { code: 'trial' } });
    if (trial) return;
    await this.plans.save(this.plans.create({ code: 'trial', name: '试用版', price: 0, maxProducts: 20, maxMembers: 1, maxSites: 1, maxWarehouses: 1, features: {}, permissions: TRIAL_PERMISSIONS, sortOrder: 0, currency: 'CNY', billingCycle: 'month', enabled: true, description: '可完整编辑并保存站点草稿，不支持发布' }));
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
    const previousQuota = { maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxSites: plan.maxSites, maxWarehouses: plan.maxWarehouses };
    Object.assign(plan, dto, { permissions: withPermissionParents(dto.permissions || []) });
    const saved = await this.plans.save(plan);
    const planTenants = await this.tenants.find({ where: { plan: saved.code } });
    const inherited = new Set(planTenants.filter(t => t.maxProducts === previousQuota.maxProducts && t.maxMembers === previousQuota.maxMembers && t.maxSites === previousQuota.maxSites && t.maxWarehouses === previousQuota.maxWarehouses).map(t => t.id));
    const changed = planTenants.filter(t => inherited.has(t.id) || !t.permissionsCustomized);
    if (changed.length) await this.tenants.save(changed.map(t => this.tenants.merge(t, { ...(inherited.has(t.id) ? { maxProducts: saved.maxProducts, maxMembers: saved.maxMembers, maxSites: saved.maxSites, maxWarehouses: saved.maxWarehouses, features: saved.features || {} } : {}), ...(!t.permissionsCustomized ? { permissions: saved.permissions || [] } : {}) })));
    return saved;
  }
  async deletePlan(id: string) { const plan = await this.plans.findOne({ where: { id } }); if (!plan) throw new NotFoundException('套餐不存在'); plan.enabled = false; return this.plans.save(plan); }
  async listOrders() { return this.orders.find({ order: { createdAt: 'DESC' } }); }
  async subscribe(tenantId: string, planId: string) {
    const [tenant, plan] = await Promise.all([this.tenants.findOne({ where: { id: tenantId } }), this.plans.findOne({ where: { id: planId, enabled: true } })]);
    if (!tenant) throw new NotFoundException('商户不存在');
    if (!plan) throw new NotFoundException('套餐不存在或已下架');
    const effectiveAt = new Date(); const expiresAt = new Date(effectiveAt);
    if (plan.billingCycle === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + 1); else expiresAt.setMonth(expiresAt.getMonth() + 1);
    Object.assign(tenant, { plan: plan.code, maxProducts: plan.maxProducts, maxMembers: plan.maxMembers, maxSites: plan.maxSites, maxWarehouses: plan.maxWarehouses, features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false, expiresAt, status: 'active' });
    const order = this.orders.create({ orderNo: `SUB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`, tenantId, planId: plan.id, planCode: plan.code, planName: plan.name, amount: Number(plan.price), currency: plan.currency, status: 'confirmed', paymentStatus: 'not_required', effectiveAt, expiresAt });
    await this.tenants.save(tenant); await this.orders.save(order); return order;
  }
  async tenantOrders(tenantId: string) { return this.orders.find({ where: { tenantId }, order: { createdAt: 'DESC' } }); }
}
