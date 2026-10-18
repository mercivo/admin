import React, { useEffect, useMemo, useState } from 'react';
import { DatePicker, Dropdown, Empty, Input, InputNumber, Select, Table, Tag, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  AlertTriangle, Building2, ChevronDown, ChevronRight,
  CreditCard, Globe2, KeyRound, LayoutDashboard, Package, Plus,
  Power, RefreshCw, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Users,
} from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import type { PermissionItem, PlanItem } from '../../services/api/index';
import { AdminLoadError, AdminPageSkeleton, AppModal, AppTable, BrandMark, createActionColumn, ModalForm, ModalFormField, ModalFormGrid, PageContent, PageHeader as SharedPageHeader, PermissionTreePicker, TableActionButton, TableActions } from '../../components/shared';
import { useTablePagination } from '../../hooks/useTablePagination';
import type { Paged } from '../../services/api/index';
import TenantGrowthChart from './TenantGrowthChart';

type Usage = { products: number; customers: number; users: number; sites: number; warehouses: number };
type Tenant = { id: string; name: string; slug: string; adminAccount?: string; status: 'active' | 'suspended'; plan: string; maxProducts: number; maxMembers: number; maxWarehouses: number; expiresAt: string | null; permissions?: string[]; defaultPermissions?: string[]; permissionMode?: 'plan' | 'custom'; quotaMode?: 'plan' | 'custom'; usage: Usage; defaultQuota: { maxProducts: number; maxMembers: number; maxWarehouses: number } | null };
type Analytics = { lifecycle: { total: number; active: number; suspended: number; expired: number; expiring: number; atRisk: number; paidTenants: number }; business: { sites: number; publishedSites: number; verifiedDomains: number; products: number; customers: number; members: number; warehouses: number; confirmedOrders: number }; utilization: { products: number; members: number; quotaWarningTenants: number }; customization: { customQuotaTenants: number; customPermissionTenants: number }; tenantGrowth: Array<{ month: string; count: number; cumulative: number }>; planDistribution: Array<{ plan: string; name: string; count: number }>; topTenants: Array<{ id: string; name: string; planName: string; products: number; customers: number; members: number; sites: number; activityScore: number }> };
type PlatformOrder = { id: string; orderNo: string; planName: string; amount: number; currency: string; status: string; createdAt: string };
type ModuleId = 'overview' | 'merchants' | 'quotas' | 'plans' | 'orders';
type TenantEditorMode = 'profile' | 'quota';

const EMPTY_ANALYTICS: Analytics = {
  lifecycle: { total: 0, active: 0, suspended: 0, expired: 0, expiring: 0, atRisk: 0, paidTenants: 0 },
  business: { sites: 0, publishedSites: 0, verifiedDomains: 0, products: 0, customers: 0, members: 0, warehouses: 0, confirmedOrders: 0 },
  utilization: { products: 0, members: 0, quotaWarningTenants: 0 },
  customization: { customQuotaTenants: 0, customPermissionTenants: 0 },
  tenantGrowth: [],
  planDistribution: [],
  topTenants: [],
};

const MENU_GROUPS: Array<{ id: string; label: string; items: Array<{ id: ModuleId; label: string; icon: React.ElementType }> }> = [
  { id: 'platform', label: '运营概览', items: [{ id: 'overview', label: '运营概览', icon: LayoutDashboard }] },
  { id: 'merchant', label: '商户管理', items: [{ id: 'merchants', label: '租户档案', icon: Building2 }, { id: 'quotas', label: '配额与权限', icon: KeyRound }] },
  { id: 'commerce', label: '套餐与订单', items: [{ id: 'plans', label: '套餐管理', icon: CreditCard }, { id: 'orders', label: '订阅订单', icon: ShoppingCart }] },
];
const MODULE_IDS = new Set(MENU_GROUPS.flatMap(group => group.items.map(item => item.id)));
const MODULE_META: Record<ModuleId, { title: string; description: string; parent: string }> = {
  overview: { title: '运营概览', description: '统一洞察平台经营、租户增长、ERP 资产、独立站运营与资源风险', parent: '运营概览' },
  merchants: { title: '租户档案', description: '统一维护商户状态、套餐与业务使用信息', parent: '商户管理' },
  quotas: { title: '配额与权限', description: '按商户配置商品、成员、仓库额度及功能权限', parent: '商户管理' },
  plans: { title: '套餐管理', description: '配置套餐价格、资源上限与菜单功能权限', parent: '套餐与订单' },
  orders: { title: '订阅订单', description: '查看商户套餐订购与生效记录', parent: '套餐与订单' },
};

const cardClass = 'overflow-hidden rounded-2xl border border-border bg-card shadow-sm';
const actionClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60';
const subtleButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary';

const PageHeader = ({ module, action }: { module: ModuleId; action?: React.ReactNode }) => {
  const meta = MODULE_META[module];
  return <SharedPageHeader title={meta.title} description={meta.description} action={action}/>;
};

const MetricCard = ({ label, value, icon: Icon, tone, note }: { label: string; value: React.ReactNode; icon: React.ElementType; tone: string; note?: string }) => <div className={`${cardClass} p-5`}>
  <div className="flex items-start justify-between"><div><div className="text-sm text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</div>{note && <div className="mt-2 text-xs text-muted-foreground">{note}</div>}</div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19}/></div></div>
</div>;
const ProgressRow = ({ label, value, tone = 'bg-primary' }: { label: string; value: number; tone?: string }) => <div><div className="mb-1.5 flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }}/></div></div>;

const SystemAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { module: rawModule } = useParams<{ module: string }>();
  const module = rawModule as ModuleId;
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [newTenant, setNewTenant] = useState<{ name: string; phone: string; plan: string; expiresAt: string | null } | null>(null);
  const [tenantEditorMode, setTenantEditorMode] = useState<TenantEditorMode | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [keyword, setKeyword] = useState('');
  const [tenantStatus, setTenantStatus] = useState<'all' | Tenant['status']>('all');
  const [loading, setLoading] = useState(true);
  const [loadedModule, setLoadedModule] = useState<ModuleId | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const tenantPagination = useTablePagination();
  const orderPagination = useTablePagination();
  const [tenantSummary, setTenantSummary] = useState({ maxProducts: 0, maxMembers: 0, maxWarehouses: 0 });

  const loadTenants = async () => {
    const result = await api.get<unknown, Paged<Tenant> & { summary: typeof tenantSummary }>('/system/tenants', { params: { page: tenantPagination.current, pageSize: tenantPagination.pageSize, keyword: keyword || undefined, status: tenantStatus === 'all' ? undefined : tenantStatus } });
    setTenants(result.items); tenantPagination.reconcile(result.total); setTenantSummary(result.summary);
  };
  const loadPage = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      if (module === 'overview') {
        const result = await api.get<unknown, Partial<Analytics>>('/system/analytics');
        setAnalytics({
          ...EMPTY_ANALYTICS,
          ...result,
          lifecycle: { ...EMPTY_ANALYTICS.lifecycle, ...result.lifecycle },
          business: { ...EMPTY_ANALYTICS.business, ...result.business },
          utilization: { ...EMPTY_ANALYTICS.utilization, ...result.utilization },
          customization: { ...EMPTY_ANALYTICS.customization, ...result.customization },
          tenantGrowth: Array.isArray(result.tenantGrowth) ? result.tenantGrowth : [],
          planDistribution: Array.isArray(result.planDistribution) ? result.planDistribution : [],
          topTenants: Array.isArray(result.topTenants) ? result.topTenants : [],
        });
      } else if (module === 'merchants' || module === 'quotas') {
        await loadTenants();
      } else if (module === 'plans') {
        setPlans(await api.get<unknown, PlanItem[]>('/system/plans'));
      } else if (module === 'orders') {
        const result = await api.get<unknown, Paged<PlatformOrder>>('/system/orders', { params: { page: orderPagination.current, pageSize: orderPagination.pageSize } });
        setOrders(result.items); orderPagination.reconcile(result.total);
      }
      setLoadedModule(module);
    } catch { setLoadFailed(true); message.error('系统管理数据加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => void loadPage(), 250); return () => window.clearTimeout(timer); }, [module, tenantPagination.current, tenantPagination.pageSize, orderPagination.current, orderPagination.pageSize, keyword, tenantStatus]);
  useEffect(() => { tenantPagination.reset(); }, [keyword, tenantStatus]);
  const filteredTenants = tenants;
  const loadEditorOptions = async () => {
    const [planItems, permissionItems] = await Promise.all([api.get<unknown, PlanItem[]>('/system/plan-options'), api.get<unknown, PermissionItem[]>('/system/permissions')]);
    setPlans(planItems); setPermissions(permissionItems);
    return { planItems, permissionItems };
  };
  const openTenantEditor = async (tenant: Tenant, mode: TenantEditorMode) => {
    try {
      await loadEditorOptions();
      setEditingTenant({ ...tenant, permissions: [...(tenant.permissions || [])] });
      setTenantEditorMode(mode);
    } catch { message.error('租户编辑选项加载失败'); }
  };
  const closeTenantEditor = () => {
    setEditingTenant(null);
    setTenantEditorMode(null);
  };
  const openNewTenant = async () => {
    try {
      const planItems = await api.get<unknown, PlanItem[]>('/system/plan-options');
      setPlans(planItems);
      setNewTenant({ name: '', phone: '', plan: planItems.find(item => item.code === 'standard')?.code || planItems[0]?.code || '', expiresAt: null });
    } catch { message.error('租户创建选项加载失败'); }
  };
  const createTenant = async () => {
    if (!newTenant?.name.trim() || !newTenant.phone.trim() || !newTenant.plan) return message.warning('请完整填写租户名称、登录手机号和套餐');
    setSaving(true);
    try {
      await api.post('/system/tenants', { ...newTenant, name: newTenant.name.trim(), phone: newTenant.phone.trim(), expiresAt: newTenant.expiresAt || undefined });
      message.success('租户已创建，初始密码为 12345678'); setNewTenant(null); await loadPage();
    } catch { message.error('租户创建失败'); }
    finally { setSaving(false); }
  };
  const resetTenantPassword = (tenant: Tenant) => AppModal.confirm({
    title: '重置租户管理员密码', content: `确认将“${tenant.name}”管理员密码重置为 12345678？`, okText: '确认重置', cancelText: '取消',
    onOk: async () => { await api.post(`/system/tenants/${tenant.id}/reset-password`); message.success('密码已重置为 12345678'); },
  });
  const toggleTenantStatus = (tenant: Tenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
    const action = nextStatus === 'suspended' ? '停用' : '启用';
    AppModal.confirm({
      title: `${action}租户账号`,
      content: nextStatus === 'suspended' ? `停用“${tenant.name}”后，该租户管理员及全部团队成员将立即无法登录和访问系统。` : `确认恢复“${tenant.name}”及其团队成员的账号访问？`,
      okText: `确认${action}`,
      cancelText: '取消',
      okButtonProps: nextStatus === 'suspended' ? { danger: true } : undefined,
      onOk: async () => {
        await api.patch(`/system/tenants/${tenant.id}`, { status: nextStatus });
        message.success(`租户已${action}`);
        await loadPage();
      },
    });
  };
  const resetTenantConfigurationToPlan = () => {
    if (!editingTenant) return;
    const plan = plans.find(item => item.code === editingTenant.plan);
    if (!plan) return message.warning('当前套餐不存在，无法恢复默认配置');
    setEditingTenant({
      ...editingTenant,
      maxProducts: plan.maxProducts,
      maxMembers: plan.maxMembers,
      maxWarehouses: plan.maxWarehouses,
      permissions: [...plan.permissions],
      quotaMode: 'plan',
      permissionMode: 'plan',
    });
  };

  const saveTenant = async () => {
    if (!editingTenant || !tenantEditorMode) return;
    const selectedPlan = plans.find(item => item.code === editingTenant.plan);
    const selectedPermissions = [...new Set(editingTenant.permissions || [])];
    const permissionsUsePlanDefaults = Boolean(selectedPlan
      && selectedPermissions.length === selectedPlan.permissions.length
      && selectedPermissions.every(permission => selectedPlan.permissions.includes(permission)));
    setSaving(true);
    try {
      const payload = tenantEditorMode === 'profile'
        ? { status: editingTenant.status, plan: editingTenant.plan, expiresAt: editingTenant.expiresAt || undefined }
        : {
            maxProducts: Math.max(1, Number(editingTenant.maxProducts) || 1),
            maxMembers: Math.max(1, Number(editingTenant.maxMembers) || 1),
            maxWarehouses: Math.max(1, Number(editingTenant.maxWarehouses) || 1),
            permissions: selectedPermissions,
            permissionsCustomized: !permissionsUsePlanDefaults,
          };
      await api.patch(`/system/tenants/${editingTenant.id}`, payload);
      message.success(tenantEditorMode === 'profile' ? '租户档案已保存' : '配额与权限已保存'); closeTenantEditor(); await loadPage();
    } catch { message.error(tenantEditorMode === 'profile' ? '租户档案保存失败' : '配额与权限保存失败'); }
    finally { setSaving(false); }
  };
  const savePlan = async () => {
    if (!editingPlan?.name.trim()) return message.warning('请填写套餐名称');
    setSaving(true);
    try {
      const payload = {
        name: editingPlan.name.trim(),
        price: Math.max(0, Number(editingPlan.price) || 0),
        currency: editingPlan.currency || 'CNY',
        billingCycle: editingPlan.billingCycle,
        description: editingPlan.description || '',
        maxProducts: Math.max(1, Number(editingPlan.maxProducts) || 1),
        maxMembers: Math.max(1, Number(editingPlan.maxMembers) || 1),
        maxWarehouses: Math.max(1, Number(editingPlan.maxWarehouses) || 1),
        features: editingPlan.features || {},
        permissions: [...new Set(editingPlan.permissions || [])],
        enabled: editingPlan.enabled,
        sortOrder: Math.max(0, Number(editingPlan.sortOrder) || 0),
      };
      if (editingPlan.id) await api.put(`/system/plans/${editingPlan.id}`, payload); else await api.post('/system/plans', payload);
      message.success('套餐已保存'); setEditingPlan(null); await loadPage();
    } catch { message.error('套餐保存失败'); }
    finally { setSaving(false); }
  };
  const openNewPlan = async () => {
    try {
      const permissionItems = await api.get<unknown, PermissionItem[]>('/system/permissions');
      setPermissions(permissionItems);
      setEditingPlan({ id: '', code: '', name: '', price: 0, currency: 'CNY', billingCycle: 'month', description: '', maxProducts: 20, maxMembers: 1, maxWarehouses: 1, features: {}, permissions: permissionItems.map(item => item.key), enabled: true, sortOrder: plans.length });
    } catch { message.error('权限选项加载失败'); }
  };
  const openPlanEditor = async (plan: PlanItem) => {
    try {
      setPermissions(await api.get<unknown, PermissionItem[]>('/system/permissions'));
      setEditingPlan({ ...plan, permissions: [...plan.permissions] });
    } catch { message.error('权限选项加载失败'); }
  };
  const logout = () => {
    localStorage.removeItem('mercivo_access_token');
    localStorage.removeItem('mercivo_user');
    localStorage.removeItem('mercivo_tenant');
    window.location.assign('/login');
  };
  const systemUserMenuItems: MenuProps['items'] = [
    { key: 'logout', label: <span className="text-red-500">退出登录</span> },
  ];
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}') as { account?: string }; }
    catch { return {}; }
  })();
  if (!MODULE_IDS.has(module)) return <Navigate to="/system/overview" replace/>;

  const tenantColumns = [
    { title: '租户信息', width: 240, render: (_: unknown, row: Tenant) => <div className="min-w-0"><div className="truncate font-semibold text-foreground" title={row.name}>{row.name || '-'}</div><div className="mt-0.5 truncate text-xs text-muted-foreground" title={row.slug}>{row.slug || '-'}</div></div> },
    { title: '管理员账号', dataIndex: 'adminAccount', width: 160, render: (value: string) => value || '-' },
    { title: '状态', dataIndex: 'status', width: 100, render: (value: Tenant['status']) => <Tag color={value === 'active' ? 'green' : 'red'}>{value === 'active' ? '正常' : '已停用'}</Tag> },
    { title: '套餐', dataIndex: 'plan', width: 120, render: (value: string) => plans.find(plan => plan.code === value)?.name || value },
    { title: '商品', width: 90, render: (_: unknown, row: Tenant) => row.usage.products },
    { title: '客户', width: 90, render: (_: unknown, row: Tenant) => row.usage.customers },
    { title: '站点', width: 90, render: (_: unknown, row: Tenant) => row.usage.sites },
    { title: '有效期', width: 120, render: (_: unknown, row: Tenant) => row.expiresAt ? dayjs(row.expiresAt).format('YYYY-MM-DD') : '长期有效' },
    createActionColumn<Tenant>({ actions: 3, render: (_: unknown, row: Tenant) => <TableActions><TableActionButton title="编辑租户档案" tone="primary" onClick={() => openTenantEditor(row, 'profile')}><SlidersHorizontal size={15}/></TableActionButton><TableActionButton title="重置管理员密码" tone="warning" onClick={() => resetTenantPassword(row)}><KeyRound size={15}/></TableActionButton><TableActionButton title={row.status === 'active' ? '停用租户' : '启用租户'} tone={row.status === 'active' ? 'danger' : 'primary'} onClick={() => toggleTenantStatus(row)}><Power size={15}/></TableActionButton></TableActions> }),
  ];

  return <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <header className="flex h-16 shrink-0 select-none items-center gap-5 border-b border-border bg-white px-5 shadow-[0_1px_0_rgba(91,68,232,0.07)]">
      <div className="flex h-full shrink-0 items-center gap-3"><BrandMark size={30}/><div className="flex flex-col justify-center gap-0.5"><div className="text-sm font-bold leading-tight tracking-tight">迈犀沃</div><div className="text-[10px] leading-tight text-muted-foreground">外贸 ERP 与独立站平台</div></div></div>
      <div className="h-6 w-px shrink-0 bg-border"/>
      <div className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary/10 px-3.5 text-sm font-normal text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary"/>系统管理</div>
      <div className="flex-1"/>
      <div className="w-80"><Input value={keyword} onChange={event => setKeyword(event.target.value)} allowClear prefix={<Search className="h-4 w-4 text-muted-foreground"/>} suffix={<kbd className="rounded border border-border bg-white px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>} placeholder="搜索租户、套餐或订单..." variant="filled" size="middle"/></div>
      <button onClick={() => void loadPage()} disabled={loading} aria-label="刷新数据" title="刷新数据" className="relative shrink-0 rounded-xl p-2 transition-colors hover:bg-secondary disabled:opacity-50"><RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`}/></button>
      <Dropdown menu={{ items: systemUserMenuItems, onClick: ({ key }) => { if (key === 'logout') logout(); } }} trigger={['click']} placement="bottomRight">
        <button className="flex shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-secondary"><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format" alt="Avatar" className="h-7 w-7 rounded-full object-cover ring-2 ring-primary/20"/><span className="text-xs font-semibold text-foreground">系统管理员</span><ChevronDown className="h-3 w-3 text-muted-foreground"/></button>
      </Dropdown>
    </header>

    <div className="flex min-h-0 flex-1">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-[var(--sidebar)]">
        <nav className="flex-1 space-y-5 overflow-auto px-3 py-4">
          {MENU_GROUPS.map(group => <section key={group.id}>
            <button onClick={() => setCollapsed(value => ({ ...value, [group.id]: !value[group.id] }))} className="flex w-full items-center justify-between px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-foreground/60 transition hover:text-foreground">
              <span>{group.label}</span>{collapsed[group.id] ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
            </button>
            {!collapsed[group.id] && <div className="space-y-0.5">{group.items.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => navigate(`/system/${id}`)} aria-label={label} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${module === id ? 'bg-primary/10 text-primary' : 'text-foreground/80 hover:bg-secondary hover:text-foreground'}`}><Icon size={16}/><span>{label}</span>{module === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"/>}</button>)}</div>}
          </section>)}
        </nav>
        <div className="border-t border-border p-3">
          <Dropdown menu={{ items: systemUserMenuItems, onClick: ({ key }) => { if (key === 'logout') logout(); } }} placement="topLeft" trigger={['click']}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary"><img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format" alt="Avatar" className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/20"/><div className="min-w-0 flex-1 text-left"><div className="text-sm font-semibold text-foreground">系统管理员</div><div className="truncate text-xs text-muted-foreground">{storedUser.account || '管理员账号'}</div></div><ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/></button>
          </Dropdown>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6"><PageContent>
        {loading && loadedModule !== module ? <><PageHeader module={module}/><AdminPageSkeleton variant={module === 'overview' ? 'dashboard' : module === 'plans' ? 'cards' : 'table'}/></> : loadFailed && loadedModule !== module ? <><PageHeader module={module}/><AdminLoadError title="系统管理数据加载失败" onRetry={() => void loadPage()}/></> : <>
        {module === 'overview' && <><PageHeader module={module}/>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="租户运营" value={`${analytics?.lifecycle.active || 0} / ${analytics?.lifecycle.total || 0}`} icon={Building2} tone="bg-emerald-50 text-emerald-600" note={`${analytics?.lifecycle.paidTenants || 0} 家付费套餐租户`}/><MetricCard label="ERP 业务资产" value={(analytics?.business.products || 0) + (analytics?.business.customers || 0)} icon={Package} tone="bg-indigo-50 text-indigo-600" note={`${analytics?.business.products || 0} 商品 · ${analytics?.business.customers || 0} 客户`}/><MetricCard label="独立站发布率" value={`${analytics?.business.sites ? Math.round(analytics.business.publishedSites / analytics.business.sites * 100) : 0}%`} icon={Globe2} tone="bg-sky-50 text-sky-600" note={`${analytics?.business.publishedSites || 0} / ${analytics?.business.sites || 0} 已发布`}/><MetricCard label="运营风险租户" value={analytics?.lifecycle.atRisk || 0} icon={AlertTriangle} tone="bg-red-50 text-red-600" note="停用、已过期或 7 天内到期（已去重）"/></div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className={`${cardClass} p-5`}><div className="mb-5"><h2 className="font-bold">近 12 个月租户增长</h2><p className="mt-1 text-xs text-muted-foreground">折线展示新增与累计租户，悬停查看月份明细</p></div><div className="h-64"><TenantGrowthChart data={analytics?.tenantGrowth || []}/></div></section><section className={`${cardClass} p-5`}><div className="mb-5"><h2 className="font-bold">租户生命周期</h2><p className="mt-1 text-xs text-muted-foreground">关注续费、留存与异常租户</p></div><div className="grid grid-cols-2 gap-3">{[{label:'正常运营',value:analytics?.lifecycle.active||0,tone:'bg-emerald-50 text-emerald-700'},{label:'7 天内到期',value:analytics?.lifecycle.expiring||0,tone:'bg-amber-50 text-amber-700'},{label:'已过期',value:analytics?.lifecycle.expired||0,tone:'bg-red-50 text-red-700'},{label:'已停用',value:analytics?.lifecycle.suspended||0,tone:'bg-slate-100 text-slate-700'}].map(item=><div key={item.label} className={`rounded-xl p-4 ${item.tone}`}><div className="text-2xl font-bold">{item.value}</div><div className="mt-1 text-sm">{item.label}</div></div>)}</div><button onClick={()=>navigate('/system/merchants')} className="mt-5 text-sm font-semibold text-primary">进入租户管理 →</button></section></div>

          <div className="grid gap-5 xl:grid-cols-2"><section className={`${cardClass} p-5`}><div className="mb-5"><h2 className="font-bold">ERP 与站点运营</h2><p className="mt-1 text-xs text-muted-foreground">衡量业务沉淀与独立站交付质量</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[{label:'商品',value:analytics?.business.products||0},{label:'客户',value:analytics?.business.customers||0},{label:'成员',value:analytics?.business.members||0},{label:'仓库',value:analytics?.business.warehouses||0},{label:'独立站',value:analytics?.business.sites||0},{label:'已验证域名',value:analytics?.business.verifiedDomains||0}].map(item=><div key={item.label} className="rounded-xl bg-secondary/60 p-4"><div className="text-xl font-bold">{item.value}</div><div className="mt-1 text-xs text-muted-foreground">{item.label}</div></div>)}</div></section><section className={`${cardClass} p-5`}><div className="mb-5 flex items-start justify-between"><div><h2 className="font-bold">订阅经营</h2><p className="mt-1 text-xs text-muted-foreground">统计套餐订阅规模、付费转化与近期续费压力</p></div><CreditCard size={18} className="text-primary"/></div><div className="grid grid-cols-2 gap-3">{[{label:'已确认订阅订单',value:analytics?.business.confirmedOrders||0,tone:'bg-primary/5 text-primary'},{label:'付费套餐租户',value:analytics?.lifecycle.paidTenants||0,tone:'bg-emerald-50 text-emerald-700'},{label:'付费租户占比',value:`${analytics?.lifecycle.total ? Math.round(analytics.lifecycle.paidTenants / analytics.lifecycle.total * 100) : 0}%`,tone:'bg-blue-50 text-blue-700'},{label:'7 天内待续费',value:analytics?.lifecycle.expiring||0,tone:'bg-amber-50 text-amber-700'}].map(item=><div key={item.label} className={`rounded-xl p-4 ${item.tone}`}><div className="text-2xl font-bold">{item.value}</div><div className="mt-1 text-xs">{item.label}</div></div>)}</div><button onClick={()=>navigate('/system/orders')} className="mt-5 text-sm font-semibold text-primary">查看订阅订单 →</button></section></div>

          <div className="grid gap-5 xl:grid-cols-2"><section className={`${cardClass} p-5`}><div className="mb-5"><h2 className="font-bold">套餐结构</h2><p className="mt-1 text-xs text-muted-foreground">识别试用转化与付费套餐占比</p></div><div className="space-y-3">{(analytics?.planDistribution||[]).map(item=>{const percent=Math.round(item.count/Math.max(analytics?.lifecycle.total||1,1)*100);return <div key={item.plan}><div className="mb-1.5 flex justify-between text-sm"><span>{item.name}</span><b>{item.count} 家 · {percent}%</b></div><div className="h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-violet-500" style={{width:`${percent}%`}}/></div></div>})}</div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-amber-50 p-3"><div className="text-xl font-bold text-amber-700">{analytics?.customization.customQuotaTenants||0}</div><div className="text-xs text-amber-700">自定义配额租户</div></div><div className="rounded-xl bg-blue-50 p-3"><div className="text-xl font-bold text-blue-700">{analytics?.customization.customPermissionTenants||0}</div><div className="text-xs text-blue-700">自定义权限租户</div></div></div></section><section className={`${cardClass} p-5`}><div className="mb-5"><h2 className="font-bold">资源健康度</h2><p className="mt-1 text-xs text-muted-foreground">平台平均配额使用水平</p></div><div className="space-y-5"><ProgressRow label="商品配额利用率" value={analytics?.utilization.products||0}/><ProgressRow label="成员配额利用率" value={analytics?.utilization.members||0} tone="bg-amber-500"/><div className="rounded-xl bg-red-50 p-3 text-sm text-red-700"><b>{analytics?.utilization.quotaWarningTenants||0}</b> 家租户配额使用超过 80%</div></div><button onClick={()=>navigate('/system/quotas')} className="mt-5 text-sm font-semibold text-primary">处理配额风险 →</button></section></div>

          <section className={cardClass}><div className="border-b border-border px-5 py-4"><h2 className="font-bold">高活跃租户</h2><p className="mt-1 text-xs text-muted-foreground">按商品、客户、成员和站点综合活跃度排序</p></div><Table rowKey="id" loading={loading} dataSource={analytics?.topTenants || []} pagination={false} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无租户数据"/>}} columns={[{title:'租户',dataIndex:'name',render:v=><b>{v}</b>},{title:'套餐',dataIndex:'planName'},{title:'商品',dataIndex:'products'},{title:'客户',dataIndex:'customers'},{title:'站点',dataIndex:'sites'},{title:'成员',dataIndex:'members'},{title:'活跃分',dataIndex:'activityScore',render:v=><Tag color="purple">{v}</Tag>}]}/></section>

        </>}

        {module === 'merchants' && <><PageHeader module={module} action={<button onClick={()=>void openNewTenant()} className={actionClass}><Plus size={16}/>新增租户</button>}/><section className={cardClass}><div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4"><div className="w-80 max-w-full"><Input value={keyword} onChange={event=>setKeyword(event.target.value)} allowClear prefix={<Search size={15} className="text-muted-foreground"/>} placeholder="搜索租户名称、标识或管理员账号" variant="filled" size="middle"/></div><Select value={tenantStatus} onChange={setTenantStatus} style={{width:140}} variant="filled" size="middle" options={[{value:'all',label:'全部状态'},{value:'active',label:'正常'},{value:'suspended',label:'停用'}]}/><span className="ml-auto text-xs text-muted-foreground">共 {tenantPagination.total} 条</span></div><AppTable rowKey="id" loading={loading} dataSource={filteredTenants} columns={tenantColumns} scroll={{x:1040}} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无租户"/>}} pagination={tenantPagination.config}/></section></>}

        {module === 'quotas' && <><PageHeader module={module}/><div className="grid gap-4 md:grid-cols-3"><MetricCard label="商品总配额" value={tenantSummary.maxProducts} icon={Package} tone="bg-indigo-50 text-indigo-600"/><MetricCard label="成员总配额" value={tenantSummary.maxMembers} icon={Users} tone="bg-amber-50 text-amber-600"/><MetricCard label="仓库总配额" value={tenantSummary.maxWarehouses} icon={Package} tone="bg-violet-50 text-violet-600"/></div><section className={cardClass}><AppTable rowKey="id" loading={loading} dataSource={tenants} scroll={{x:760}} pagination={tenantPagination.config} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无租户"/>}} columns={[{title:'租户',dataIndex:'name',render:v=><b>{v}</b>},{title:'商品配额',render:(_,r)=>`${r.usage.products} / ${r.maxProducts}`},{title:'成员配额',render:(_,r)=>`${r.usage.users} / ${r.maxMembers}`},{title:'仓库配额',render:(_,r)=>`${r.usage.warehouses} / ${r.maxWarehouses}`},{title:'权限来源',render:(_,r)=><Tag color={r.permissionMode==='custom'?'gold':'blue'}>{r.permissionMode==='custom'?'租户自定义':'跟随套餐'}</Tag>},createActionColumn<Tenant>({actions:1,render:(_,r)=><TableActions><TableActionButton title="调整配额与权限" tone="primary" onClick={()=>openTenantEditor(r, 'quota')}><SlidersHorizontal size={15}/></TableActionButton></TableActions>})]}/></section></>}

        {module === 'plans' && <><PageHeader module={module} action={<button onClick={() => void openNewPlan()} className={actionClass}><Plus size={16}/>新增套餐</button>}/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map(plan=><article key={plan.id} className={`${cardClass} p-5`}><div className="flex items-start justify-between"><div className="font-bold">{plan.name}</div><Tag color={plan.enabled?'green':'default'}>{plan.enabled?'已启用':'已停用'}</Tag></div><div className="mt-5"><span className="text-3xl font-bold">¥{Number(plan.price).toLocaleString()}</span><span className="ml-1 text-xs text-muted-foreground">/{plan.billingCycle==='year'?'年':'月'}</span></div><p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">{plan.description||'暂无套餐说明'}</p><div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-secondary/50 py-3 text-center"><div><b>{plan.maxProducts}</b><small className="mt-1 block text-muted-foreground">商品</small></div><div><b>{plan.maxMembers}</b><small className="mt-1 block text-muted-foreground">成员</small></div><div><b>{plan.maxWarehouses}</b><small className="mt-1 block text-muted-foreground">仓库</small></div></div><button onClick={()=>void openPlanEditor(plan)} className={`${subtleButtonClass} mt-4 w-full`}><SlidersHorizontal size={15}/>编辑套餐</button></article>)}{!loading&&!plans.length&&<div className={`${cardClass} col-span-full py-16`}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无套餐"/></div>}</div></>}

        {module === 'orders' && <><PageHeader module={module}/><section className={cardClass}><AppTable rowKey="id" loading={loading} dataSource={orders} pagination={orderPagination.config} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无订阅订单"/>}} columns={[{title:'订单号',dataIndex:'orderNo',render:v=><span className="font-mono text-xs">{v}</span>},{title:'套餐',dataIndex:'planName',render:v=><b>{v}</b>},{title:'金额',render:(_,r)=>`${r.currency} ${Number(r.amount).toLocaleString()}`},{title:'状态',dataIndex:'status',render:v=><Tag color={v==='active'||v==='paid'?'green':'blue'}>{v}</Tag>},{title:'创建时间',render:(_,r)=>new Date(r.createdAt).toLocaleString('zh-CN')}]}/></section></>}
        </>}
      </PageContent></main>
    </div>

    <AppModal open={!!newTenant} centered title="新增租户" okText={saving?'创建中…':'创建租户'} cancelText="取消" confirmLoading={saving} onCancel={()=>setNewTenant(null)} onOk={()=>void createTenant()} width={720}>
      {newTenant && <ModalForm><ModalFormGrid columns={2}><ModalFormField label="租户名称" required><Input variant="filled" value={newTenant.name} onChange={event=>setNewTenant({...newTenant,name:event.target.value})} placeholder="请输入企业或店铺名称"/></ModalFormField><ModalFormField label="管理员登录手机号" required><Input variant="filled" value={newTenant.phone} onChange={event=>setNewTenant({...newTenant,phone:event.target.value})} placeholder="初始密码 12345678"/></ModalFormField><ModalFormField label="所属套餐" required><Select className="w-full" variant="filled" value={newTenant.plan} onChange={plan=>setNewTenant({...newTenant,plan})} options={plans.filter(item=>item.enabled).map(item=>({value:item.code,label:item.name}))}/></ModalFormField><ModalFormField label="有效期"><DatePicker className="w-full" variant="filled" value={newTenant.expiresAt?dayjs(newTenant.expiresAt):null} onChange={value=>setNewTenant({...newTenant,expiresAt:value?.toISOString()||null})}/></ModalFormField></ModalFormGrid><div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">租户管理员初始密码统一为 12345678，登录后可通过修改密码功能更新。</div></ModalForm>}
    </AppModal>

    <AppModal open={!!editingTenant} centered title={tenantEditorMode === 'profile' ? '租户档案配置' : '配额与权限配置'} okText={saving?'保存中…':tenantEditorMode === 'profile' ? '保存档案' : '保存配置'} cancelText="取消" confirmLoading={saving} onCancel={closeTenantEditor} onOk={()=>void saveTenant()} width={tenantEditorMode === 'profile' ? 680 : 920} styles={{body:{paddingTop:20}}}>
      {editingTenant && tenantEditorMode === 'profile' && <ModalForm><ModalFormGrid columns={3}><ModalFormField label="商户状态"><Select className="w-full" variant="filled" value={editingTenant.status} onChange={status=>setEditingTenant({...editingTenant,status})} options={[{value:'active',label:'正常'},{value:'suspended',label:'停用'}]}/></ModalFormField><ModalFormField label="所属套餐"><Select className="w-full" variant="filled" value={editingTenant.plan} onChange={plan=>setEditingTenant({...editingTenant,plan})} options={plans.map(item=>({value:item.code,label:item.name}))}/></ModalFormField><ModalFormField label="有效期"><DatePicker className="w-full" variant="filled" value={editingTenant.expiresAt?dayjs(editingTenant.expiresAt):null} onChange={value=>setEditingTenant({...editingTenant,expiresAt:value?.toISOString()||null})}/></ModalFormField></ModalFormGrid></ModalForm>}
      {editingTenant && tenantEditorMode === 'quota' && <ModalForm>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-primary/5 px-4 py-3">
          <div><div className="text-sm font-semibold">{plans.find(item=>item.code===editingTenant.plan)?.name||editingTenant.plan}</div><div className="mt-0.5 text-xs text-muted-foreground">恢复默认将同时重置数量配额和功能权限</div></div>
          <button type="button" onClick={resetTenantConfigurationToPlan} className={subtleButtonClass}>恢复套餐默认</button>
        </div>
        <section className="rounded-xl border border-border p-4">
          <div className="mb-4 flex items-center gap-2"><h3 className="text-sm font-bold">数量配额</h3><Tag color={editingTenant.quotaMode==='custom'?'gold':'blue'}>{editingTenant.quotaMode==='custom'?'租户自定义':'跟随套餐'}</Tag></div>
          <ModalFormGrid columns={3}><ModalFormField label="商品上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingTenant.maxProducts} onChange={value=>setEditingTenant({...editingTenant,maxProducts:Number(value)||1,quotaMode:'custom'})}/></ModalFormField><ModalFormField label="成员上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingTenant.maxMembers} onChange={value=>setEditingTenant({...editingTenant,maxMembers:Number(value)||1,quotaMode:'custom'})}/></ModalFormField><ModalFormField label="仓库上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingTenant.maxWarehouses} onChange={value=>setEditingTenant({...editingTenant,maxWarehouses:Number(value)||1,quotaMode:'custom'})}/></ModalFormField></ModalFormGrid>
        </section>
        <section className="rounded-xl border border-border p-4">
          <div className="mb-4 flex items-center gap-2"><h3 className="text-sm font-bold">功能权限</h3><Tag color={editingTenant.permissionMode==='custom'?'gold':'blue'}>{editingTenant.permissionMode==='custom'?'租户自定义':'跟随套餐'}</Tag></div>
          <PermissionTreePicker catalog={permissions} value={editingTenant.permissions||[]} onChange={permissionKeys=>setEditingTenant({...editingTenant,permissions:permissionKeys,permissionMode:'custom'})} title=""/>
        </section>
      </ModalForm>}
    </AppModal>

    <AppModal open={!!editingPlan} centered title={editingPlan?.id?'编辑套餐':'新增套餐'} okText={saving?'保存中…':'保存套餐'} cancelText="取消" confirmLoading={saving} onCancel={()=>setEditingPlan(null)} onOk={()=>void savePlan()} width={920} styles={{body:{paddingTop:20}}}>
      {editingPlan && <ModalForm><section className="rounded-xl border border-border p-4"><h3 className="mb-4 text-sm font-bold">基础套餐信息</h3><ModalFormGrid columns={3}><ModalFormField label="套餐名称" required><Input variant="filled" value={editingPlan.name} onChange={event=>setEditingPlan({...editingPlan,name:event.target.value})} placeholder="例如：专业版"/></ModalFormField><ModalFormField label="计费周期"><Select className="w-full" variant="filled" value={editingPlan.billingCycle} onChange={billingCycle=>setEditingPlan({...editingPlan,billingCycle})} options={[{value:'month',label:'按月'},{value:'year',label:'按年'}]}/></ModalFormField><ModalFormField label="套餐价格"><InputNumber min={0} precision={2} variant="filled" className="w-full" style={{width:'100%'}} value={editingPlan.price} onChange={value=>setEditingPlan({...editingPlan,price:Number(value)||0})}/></ModalFormField><ModalFormField label="排序"><InputNumber min={0} variant="filled" className="w-full" style={{width:'100%'}} value={editingPlan.sortOrder} onChange={value=>setEditingPlan({...editingPlan,sortOrder:Number(value)||0})}/></ModalFormField><ModalFormField label="启用状态"><Select className="w-full" variant="filled" value={editingPlan.enabled} onChange={enabled=>setEditingPlan({...editingPlan,enabled})} options={[{value:true,label:'启用'},{value:false,label:'停用'}]}/></ModalFormField></ModalFormGrid><div className="mt-4"><ModalFormField label="套餐说明"><Input.TextArea rows={2} variant="filled" value={editingPlan.description} onChange={event=>setEditingPlan({...editingPlan,description:event.target.value})} placeholder="说明适用场景与主要能力"/></ModalFormField></div></section><section className="rounded-xl border border-border p-4"><h3 className="mb-4 text-sm font-bold">数量配额</h3><ModalFormGrid columns={3}><ModalFormField label="商品上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingPlan.maxProducts} onChange={value=>setEditingPlan({...editingPlan,maxProducts:Number(value)||1})}/></ModalFormField><ModalFormField label="成员上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingPlan.maxMembers} onChange={value=>setEditingPlan({...editingPlan,maxMembers:Number(value)||1})}/></ModalFormField><ModalFormField label="仓库上限"><InputNumber min={1} variant="filled" className="w-full" style={{width:'100%'}} value={editingPlan.maxWarehouses} onChange={value=>setEditingPlan({...editingPlan,maxWarehouses:Number(value)||1})}/></ModalFormField></ModalFormGrid></section><section className="rounded-xl border border-border p-4"><h3 className="mb-4 text-sm font-bold">功能权限</h3><PermissionTreePicker catalog={permissions} value={editingPlan.permissions} onChange={permissionKeys=>setEditingPlan({...editingPlan,permissions:permissionKeys})} title=""/></section></ModalForm>}
    </AppModal>
  </div>;
};

export default SystemAdminPage;
