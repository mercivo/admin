import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../site/tenant.entity';
import { Product } from '../product/product.entity';
import { Lead } from '../lead/lead.entity';
import { Agent } from '../agent/agent.entity';
import { User } from '../auth/user.entity';
import { SaveAgentPresetDto, SavePlanDto, UpdateTenantControlDto } from './system.dto';
import { Plan } from './plan.entity';
import { SubscriptionOrder } from './subscription-order.entity';
import { PERMISSION_CATALOG, TRIAL_PERMISSIONS, withPermissionParents } from './permission-catalog';
import { AgentPreset } from '../agent/agent-preset.entity';
import { Site } from '../site/site.entity';
import { SiteDomain } from '../site/site-domain.entity';
import { Opportunity } from '../opportunity/opportunity.entity';
import { OutreachCampaign } from '../outreach/outreach-campaign.entity';
import { KnowledgeFile } from '../workspace/knowledge-file.entity';
import { Customer } from '../customer/customer.entity';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Agent) private readonly agents: Repository<Agent>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    @InjectRepository(SubscriptionOrder) private readonly orders: Repository<SubscriptionOrder>,
    @InjectRepository(AgentPreset) private readonly agentPresets: Repository<AgentPreset>,
    @InjectRepository(Site) private readonly sites: Repository<Site>,
    @InjectRepository(SiteDomain) private readonly siteDomains: Repository<SiteDomain>,
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(OutreachCampaign) private readonly outreachCampaigns: Repository<OutreachCampaign>,
    @InjectRepository(KnowledgeFile) private readonly knowledgeFiles: Repository<KnowledgeFile>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
  ) {}
  async overview() {
    const [totalTenants, activeTenants, suspendedTenants, totalProducts, totalLeads, totalUsers] = await Promise.all([
      this.tenants.count(), this.tenants.count({ where: { status: 'active' } }), this.tenants.count({ where: { status: 'suspended' } }), this.products.count(), this.leads.count(), this.users.count({ where: { role: 'admin' } }),
    ]);
    return { totalTenants, activeTenants, suspendedTenants, totalProducts, totalLeads, totalUsers };
  }
  async analytics() {
    const now = new Date();
    const warningAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [tenants, plans, tenantUsage, sites, publishedSites, verifiedDomains, customers, convertedLeads, opportunities, wonOpportunities, campaigns, knowledgeFiles, orders] = await Promise.all([
      this.tenants.find({ order: { createdAt: 'ASC' } }),
      this.plans.find({ order: { sortOrder: 'ASC' } }),
      this.listTenants(),
      this.sites.count(),
      this.sites.count({ where: { status: 'published' } }),
      this.siteDomains.createQueryBuilder('domain').where('domain.verified_at IS NOT NULL').getCount(),
      this.customers.count(),
      this.leads.count({ where: { status: 'converted' } }),
      this.opportunities.count(),
      this.opportunities.count({ where: { stage: 'won' } }),
      this.outreachCampaigns.count(),
      this.knowledgeFiles.count(),
      this.orders.find(),
    ]);
    const totalLeads = tenantUsage.reduce((sum, tenant) => sum + tenant.usage.leads, 0);
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
    const expiredTenants = tenants.filter(tenant => tenant.expiresAt && new Date(tenant.expiresAt) < now).length;
    const expiringTenants = tenants.filter(tenant => tenant.expiresAt && new Date(tenant.expiresAt) >= now && new Date(tenant.expiresAt) <= warningAt).length;
    const customQuotaTenants = tenantUsage.filter(tenant => tenant.quotaMode === 'custom').length;
    const customPermissionTenants = tenants.filter(tenant => tenant.permissionsCustomized).length;
    const quotaWarningTenants = tenantUsage.filter(tenant =>
      tenant.usage.products / Math.max(tenant.maxProducts, 1) >= 0.8 ||
      tenant.usage.agents / Math.max(tenant.maxAgents, 1) >= 0.8 ||
      tenant.usage.users / Math.max(tenant.maxMembers, 1) >= 0.8
    ).length;
    const avg = (field: 'products' | 'agents' | 'users', quota: 'maxProducts' | 'maxAgents' | 'maxMembers') => tenants.length
      ? Math.round(tenantUsage.reduce((sum, tenant) => sum + Math.min(tenant.usage[field] / Math.max(tenant[quota], 1), 1), 0) / tenants.length * 100)
      : 0;
    const permissionDemand = PERMISSION_CATALOG.map(item => ({
      key: item.key,
      label: item.label,
      group: item.group,
      enabledTenants: tenants.filter(tenant => (tenant.permissions || []).includes(item.key)).length,
    })).sort((a, b) => b.enabledTenants - a.enabledTenants);
    const tenantSiteCounts = await this.sites.createQueryBuilder('site').select('site.tenant_id', 'tenantId').addSelect('COUNT(*)', 'count').groupBy('site.tenant_id').getRawMany();
    const siteCountMap = new Map(tenantSiteCounts.map(row => [row.tenantId, Number(row.count)]));
    const topTenants = tenantUsage.map(tenant => ({
      id: tenant.id, name: tenant.name, plan: tenant.plan, planName: planName.get(tenant.plan) || tenant.plan,
      products: tenant.usage.products, leads: tenant.usage.leads, agents: tenant.usage.agents, members: tenant.usage.users,
      sites: siteCountMap.get(tenant.id) || 0,
      activityScore: tenant.usage.products + tenant.usage.leads * 2 + tenant.usage.agents * 5 + tenant.usage.users * 3,
    })).sort((a, b) => b.activityScore - a.activityScore).slice(0, 10);
    const confirmedRevenue = orders.filter(order => order.status === 'confirmed').reduce((sum, order) => sum + Number(order.amount), 0);
    return {
      lifecycle: { total: tenants.length, active: tenants.filter(tenant => tenant.status === 'active').length, suspended: tenants.filter(tenant => tenant.status === 'suspended').length, expired: expiredTenants, expiring: expiringTenants },
      business: { sites, publishedSites, verifiedDomains, products: tenantUsage.reduce((sum, tenant) => sum + tenant.usage.products, 0), leads: totalLeads, convertedLeads, customers, opportunities, wonOpportunities, campaigns, knowledgeFiles, confirmedRevenue },
      conversion: { leadRate: totalLeads ? Math.round(convertedLeads / totalLeads * 1000) / 10 : 0, opportunityWinRate: opportunities ? Math.round(wonOpportunities / opportunities * 1000) / 10 : 0 },
      utilization: { products: avg('products', 'maxProducts'), agents: avg('agents', 'maxAgents'), members: avg('users', 'maxMembers'), quotaWarningTenants },
      customization: { customQuotaTenants, customPermissionTenants, permissionDemand },
      tenantGrowth, planDistribution, topTenants,
    };
  }
  async listTenants() {
    const [tenants, plans] = await Promise.all([
      this.tenants.find({ order: { createdAt: 'DESC' } }),
      this.plans.find(),
    ]);
    const planByCode = new Map(plans.map(plan => [plan.code, plan]));
    return Promise.all(tenants.map(async tenant => {
      const [products, leads, agents, users, sites] = await Promise.all([this.products.count({ where: { tenantId: tenant.id } }), this.leads.count({ where: { tenantId: tenant.id } }), this.agents.count({ where: { tenantId: tenant.id } }), this.users.count({ where: { tenantId: tenant.id } }), this.sites.count({ where: { tenantId: tenant.id } })]);
      const plan = planByCode.get(tenant.plan);
      const defaultQuota = plan ? { maxProducts: plan.maxProducts, maxAgents: plan.maxAgents, maxMembers: plan.maxMembers, maxSites: plan.maxSites } : null;
      const quotaMode = defaultQuota && tenant.maxProducts === defaultQuota.maxProducts && tenant.maxAgents === defaultQuota.maxAgents && tenant.maxMembers === defaultQuota.maxMembers && tenant.maxSites === defaultQuota.maxSites ? 'plan' : 'custom';
      const defaultPermissions = plan?.permissions || [];
      const permissionMode = tenant.permissionsCustomized ? 'custom' : 'plan';
      return { ...tenant, defaultQuota, quotaMode, defaultPermissions, permissionMode, usage: { products, leads, agents, users, sites } };
    }));
  }
  async updateTenant(id: string, dto: UpdateTenantControlDto) {
    const tenant = await this.tenants.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('商户不存在');
    if (dto.plan && dto.plan !== tenant.plan) {
      const plan = await this.plans.findOne({ where: { code: dto.plan, enabled: true } });
      if (!plan) throw new NotFoundException('套餐不存在或已下架');
      Object.assign(tenant, {
        plan: plan.code,
        maxProducts: plan.maxProducts,
        maxAgents: plan.maxAgents,
        maxMembers: plan.maxMembers,
        maxSites: plan.maxSites,
        features: plan.features || {},
        permissions: plan.permissions || [],
        permissionsCustomized: false,
      });
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
    if (trial) {
      const [allPlans, allTenants] = await Promise.all([this.plans.find(), this.tenants.find()]);
      const changedPlans = allPlans.filter(plan => JSON.stringify(withPermissionParents(plan.permissions || [])) !== JSON.stringify(plan.permissions || []));
      if (changedPlans.length) await this.plans.save(changedPlans.map(plan => this.plans.merge(plan, { permissions: withPermissionParents(plan.permissions || []) })));
      const changedTenants = allTenants.filter(tenant => JSON.stringify(withPermissionParents(tenant.permissions || [])) !== JSON.stringify(tenant.permissions || []));
      if (changedTenants.length) await this.tenants.save(changedTenants.map(tenant => this.tenants.merge(tenant, { permissions: withPermissionParents(tenant.permissions || []) })));
      return;
    }
    await this.plans.save(this.plans.create({ code: 'trial', name: '试用版', price: 0, maxProducts: 20, maxAgents: 0, maxMembers: 1, maxSites: 1, features: {}, permissions: TRIAL_PERMISSIONS, sortOrder: 0, currency: 'CNY', billingCycle: 'month', enabled: true, description: '可完整编辑并保存站点草稿，不支持发布' }));
  }
  async listPlans(enabledOnly = true) { await this.ensureDefaultPlans(); return this.plans.find({ where: enabledOnly ? { enabled: true } : {}, order: { sortOrder: 'ASC', price: 'ASC' } }); }
  async createPlan(dto: SavePlanDto) { return this.plans.save(this.plans.create({ ...dto, permissions: withPermissionParents(dto.permissions || []) })); }
  async updatePlan(id: string, dto: SavePlanDto) {
    const plan = await this.plans.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('套餐不存在');
    const previousQuota = { maxProducts: plan.maxProducts, maxAgents: plan.maxAgents, maxMembers: plan.maxMembers, maxSites: plan.maxSites };
    Object.assign(plan, dto);
    plan.permissions = withPermissionParents(dto.permissions || []);
    const saved = await this.plans.save(plan);
    const planTenants = await this.tenants.find({ where: { plan: saved.code } });
    const inheritedQuotaTenants = planTenants.filter(tenant =>
      tenant.maxProducts === previousQuota.maxProducts &&
      tenant.maxAgents === previousQuota.maxAgents &&
      tenant.maxMembers === previousQuota.maxMembers &&
      tenant.maxSites === previousQuota.maxSites
    );
    const inheritedQuotaIds = new Set(inheritedQuotaTenants.map(tenant => tenant.id));
    const changedTenants = planTenants.filter(tenant => inheritedQuotaIds.has(tenant.id) || !tenant.permissionsCustomized);
    if (changedTenants.length) await this.tenants.save(changedTenants.map(tenant => this.tenants.merge(tenant, {
      ...(inheritedQuotaIds.has(tenant.id) ? { maxProducts: saved.maxProducts, maxAgents: saved.maxAgents, maxMembers: saved.maxMembers, maxSites: saved.maxSites, features: saved.features || {} } : {}),
      ...(!tenant.permissionsCustomized ? { permissions: saved.permissions || [] } : {}),
    })));
    return saved;
  }
  async deletePlan(id: string) { const plan = await this.plans.findOne({ where: { id } }); if (!plan) throw new NotFoundException('套餐不存在'); plan.enabled = false; return this.plans.save(plan); }
  async listOrders() { return this.orders.find({ order: { createdAt: 'DESC' } }); }
  async subscribe(tenantId: string, planId: string) {
    const [tenant, plan] = await Promise.all([this.tenants.findOne({ where: { id: tenantId } }), this.plans.findOne({ where: { id: planId, enabled: true } })]);
    if (!tenant) throw new NotFoundException('商户不存在');
    if (!plan) throw new NotFoundException('套餐不存在或已下架');
    const effectiveAt = new Date();
    const expiresAt = new Date(effectiveAt);
    if (plan.billingCycle === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + 1); else expiresAt.setMonth(expiresAt.getMonth() + 1);
    Object.assign(tenant, { plan: plan.code, maxProducts: plan.maxProducts, maxAgents: plan.maxAgents, maxMembers: plan.maxMembers, maxSites: plan.maxSites, features: plan.features || {}, permissions: plan.permissions || [], permissionsCustomized: false, expiresAt, status: 'active' });
    const order = this.orders.create({ orderNo: `SUB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`, tenantId, planId: plan.id, planCode: plan.code, planName: plan.name, amount: Number(plan.price), currency: plan.currency, status: 'confirmed', paymentStatus: 'not_required', effectiveAt, expiresAt });
    await this.tenants.save(tenant); await this.orders.save(order);
    return order;
  }
  async tenantOrders(tenantId: string) { return this.orders.find({ where: { tenantId }, order: { createdAt: 'DESC' } }); }
  listAgentPresets() { return this.agentPresets.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } }); }
  createAgentPreset(dto: SaveAgentPresetDto) { return this.agentPresets.save(this.agentPresets.create(dto)); }
  async updateAgentPreset(id: string, dto: SaveAgentPresetDto) {
    const preset = await this.agentPresets.findOne({ where: { id } });
    if (!preset) throw new NotFoundException('预制智能体不存在');
    return this.agentPresets.save(Object.assign(preset, dto));
  }
  async deleteAgentPreset(id: string) {
    const preset = await this.agentPresets.findOne({ where: { id } });
    if (!preset) throw new NotFoundException('预制智能体不存在');
    preset.enabled = false;
    return this.agentPresets.save(preset);
  }
}
