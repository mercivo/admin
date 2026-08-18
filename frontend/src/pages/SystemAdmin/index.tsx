import React, { useEffect, useMemo, useState } from 'react';
import { Checkbox, DatePicker, Dropdown, Input, InputNumber, Modal, Select, Switch, Table, message } from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  Bell,
  ChevronDown,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  CreditCard,
  Bot,
  BarChart3,
  Activity,
  Globe2,
  Target,
  AlertTriangle,
  ShoppingCart,
  Database,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { BrandMark } from '../../components/shared';
import api from '../../services/api';
import type { AgentPreset, PermissionItem, PlanItem } from '../../services/api/index';

type Overview = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalProducts: number;
  totalLeads: number;
  totalUsers: number;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  plan: string;
  maxProducts: number;
  maxAgents: number;
  maxMembers: number;
  maxSites: number;
  defaultQuota: { maxProducts: number; maxAgents: number; maxMembers: number; maxSites: number } | null;
  quotaMode: 'plan' | 'custom';
  features?: Record<string, boolean>;
  permissions?: string[];
  defaultPermissions?: string[];
  permissionMode?: 'plan' | 'custom';
  permissionsCustomized?: boolean;
  createdAt: string;
  expiresAt: string | null;
  usage: { products: number; leads: number; agents: number; users: number; sites: number };
};

type Analytics = {
  lifecycle: { total: number; active: number; suspended: number; expired: number; expiring: number };
  business: { sites: number; publishedSites: number; verifiedDomains: number; products: number; leads: number; convertedLeads: number; customers: number; opportunities: number; wonOpportunities: number; campaigns: number; knowledgeFiles: number; confirmedRevenue: number };
  conversion: { leadRate: number; opportunityWinRate: number };
  utilization: { products: number; agents: number; members: number; quotaWarningTenants: number };
  customization: { customQuotaTenants: number; customPermissionTenants: number; permissionDemand: Array<{ key: string; label: string; group: string; enabledTenants: number }> };
  tenantGrowth: Array<{ month: string; count: number; cumulative: number }>;
  planDistribution: Array<{ plan: string; name: string; count: number }>;
  topTenants: Array<{ id: string; name: string; planName: string; products: number; leads: number; agents: number; members: number; sites: number; activityScore: number }>;
};

type PlatformOrder = { id: string; orderNo: string; tenantId: string; planName: string; amount: number; currency: string; status: string; paymentStatus: string; effectiveAt: string; expiresAt: string | null; createdAt: string };

type ModuleId = 'overview' | 'analytics' | 'merchants' | 'quotas' | 'plans' | 'orders' | 'agent-presets';

const MENU_GROUPS = [
  { label: '经营分析', items: [{ id: 'overview' as const, label: '运营总览', icon: LayoutDashboard }, { id: 'analytics' as const, label: '多维分析', icon: BarChart3 }] },
  { label: '租户运营', items: [
    { id: 'merchants' as const, label: '租户档案', icon: Building2 },
    { id: 'quotas' as const, label: '配额与权限', icon: KeyRound },
    { id: 'orders' as const, label: '订阅订单', icon: ShoppingCart },
  ] },
  { label: '产品配置', items: [
    { id: 'plans' as const, label: '套餐管理', icon: CreditCard },
    { id: 'agent-presets' as const, label: '智能体模板', icon: Bot },
  ] },
] as const;

const MODULE_IDS = new Set<ModuleId>(MENU_GROUPS.flatMap(group => group.items.map(item => item.id)));

const StatCard: React.FC<{ label: string; value?: string | number; icon: React.ElementType; tone: string; detail: string }> = ({ label, value = 0, icon: Icon, tone, detail }) => (
  <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
    <div className="mb-3 flex items-start justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div>
    </div>
    <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </div>
);

const QuotaUsage: React.FC<{ value: number; used: number }> = ({ value, used }) => {
  const rate = Math.min(100, Math.round((used / Math.max(value, 1)) * 100));
  return <div className="w-32">
    <div className="flex items-center justify-between text-xs"><span className="font-semibold text-foreground">{value}</span><span className="text-muted-foreground">已用 {used}</span></div>
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full rounded-full ${rate >= 90 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${rate}%` }} /></div>
  </div>;
};

const SystemAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { module: moduleParam } = useParams<{ module: string }>();
  const module = moduleParam as ModuleId;
  const [overview, setOverview] = useState<Overview>();
  const [analytics, setAnalytics] = useState<Analytics>();
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionItem[]>([]);
  const [agentPresets, setAgentPresets] = useState<AgentPreset[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [editingQuota, setEditingQuota] = useState<Tenant | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Tenant | null>(null);
  const [editingLifecycle, setEditingLifecycle] = useState<Tenant | null>(null);
  const [editingAgentPreset, setEditingAgentPreset] = useState<AgentPreset | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(MENU_GROUPS.map(group => [group.label, group.label !== '经营分析']));
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('mercivo_system_menu_collapsed') || '{}') }; } catch { return defaults; }
  });

  const toggleGroup = (label: string) => setCollapsedGroups(current => {
    const next = { ...current, [label]: !current[label] };
    localStorage.setItem('mercivo_system_menu_collapsed', JSON.stringify(next));
    return next;
  });

  const load = async () => {
    setLoading(true);
    try {
      const [summary, analyticsData, merchantList, planItems, permissionItems, presetItems, orderItems] = await Promise.all([
        api.get<unknown, Overview>('/system/overview'),
        api.get<unknown, Analytics>('/system/analytics'),
        api.get<unknown, Tenant[]>('/system/tenants'),
        api.get<unknown, PlanItem[]>('/system/plans'),
        api.get<unknown, PermissionItem[]>('/system/permissions'),
        api.get<unknown, AgentPreset[]>('/system/agent-presets'),
        api.get<unknown, PlatformOrder[]>('/system/orders'),
      ]);
      setOverview(summary);
      setAnalytics(analyticsData);
      setOrders(orderItems);
      setTenants(merchantList);
      setPlans(planItems); setPermissionCatalog(permissionItems); setAgentPresets(presetItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const update = async (id: string, data: Record<string, unknown>) => {
    await api.patch(`/system/tenants/${id}`, data);
    message.success('商户信息已更新');
    await load();
  };
  const saveQuota = async () => {
    if (!editingQuota) return;
    await update(editingQuota.id, {
      maxProducts: editingQuota.maxProducts,
      maxAgents: editingQuota.maxAgents,
      maxMembers: editingQuota.maxMembers,
      maxSites: editingQuota.maxSites,
    });
    setEditingQuota(null);
  };
  const saveLifecycle = async () => {
    if (!editingLifecycle) return;
    await update(editingLifecycle.id, { status: editingLifecycle.status, plan: editingLifecycle.plan, ...(editingLifecycle.expiresAt ? { expiresAt: editingLifecycle.expiresAt } : {}) });
    setEditingLifecycle(null);
  };
  const resetQuota = async (tenant: Tenant) => {
    if (!tenant.defaultQuota) return message.warning('当前套餐没有可用的默认配额');
    await update(tenant.id, tenant.defaultQuota);
    message.success('已恢复套餐默认配额');
  };
  const savePlan = async () => {
    if (!editingPlan?.code.trim() || !editingPlan.name.trim()) return message.warning('请填写套餐编码和名称');
    const payload = {
      code: editingPlan.code.trim(), name: editingPlan.name.trim(), price: Math.max(0, Number(editingPlan.price) || 0),
      currency: editingPlan.currency || 'CNY', billingCycle: editingPlan.billingCycle || 'month', description: editingPlan.description || '',
      maxProducts: Math.max(1, Number(editingPlan.maxProducts) || 1), maxAgents: Math.max(0, Number(editingPlan.maxAgents) || 0),
      maxMembers: Math.max(1, Number(editingPlan.maxMembers) || 1),
      maxSites: Math.max(1, Number(editingPlan.maxSites) || 1),
      features: editingPlan.features || {}, permissions: editingPlan.permissions || [],
      enabled: editingPlan.enabled !== false, sortOrder: Number(editingPlan.sortOrder) || 0,
    };
    if (editingPlan.id) await api.put(`/system/plans/${editingPlan.id}`, payload); else await api.post('/system/plans', payload);
    message.success('套餐已保存'); setEditingPlan(null); await load();
  };
  const saveAgentPreset = async () => {
    if (!editingAgentPreset?.code.trim() || !editingAgentPreset.name.trim()) return message.warning('请填写模板编码和名称');
    const payload = { ...editingAgentPreset, code: editingAgentPreset.code.trim(), name: editingAgentPreset.name.trim(), description: editingAgentPreset.description.trim(), systemPrompt: editingAgentPreset.systemPrompt || '', sortOrder: Number(editingAgentPreset.sortOrder) || 0 };
    if (editingAgentPreset.id) await api.put(`/system/agent-presets/${editingAgentPreset.id}`, payload); else await api.post('/system/agent-presets', payload);
    message.success('智能体模板已保存'); setEditingAgentPreset(null); await load();
  };
  const togglePlanPermission = (key: string, checked: boolean) => {
    if (!editingPlan) return;
    const selected = new Set(editingPlan.permissions);
    const findChildren = (parentKey: string): string[] => permissionCatalog.filter(item => item.parentKey === parentKey).flatMap(item => [item.key, ...findChildren(item.key)]);
    if (checked) {
      selected.add(key);
      let current = permissionCatalog.find(item => item.key === key);
      while (current?.parentKey) { selected.add(current.parentKey); current = permissionCatalog.find(item => item.key === current?.parentKey); }
    } else {
      selected.delete(key);
      findChildren(key).forEach(child => selected.delete(child));
    }
    setEditingPlan({ ...editingPlan, permissions: [...selected] });
  };
  const updatePermissionSelection = (permissions: string[], key: string, checked: boolean) => {
    const selected = new Set(permissions);
    const children = (parentKey: string): string[] => permissionCatalog.filter(item => item.parentKey === parentKey).flatMap(item => [item.key, ...children(item.key)]);
    if (checked) {
      selected.add(key);
      let current = permissionCatalog.find(item => item.key === key);
      while (current?.parentKey) { selected.add(current.parentKey); current = permissionCatalog.find(item => item.key === current?.parentKey); }
    } else {
      selected.delete(key);
      children(key).forEach(child => selected.delete(child));
    }
    return [...selected];
  };
  const saveTenantPermissions = async () => {
    if (!editingPermissions) return;
    await update(editingPermissions.id, { permissions: editingPermissions.permissions || [], permissionsCustomized: true });
    setEditingPermissions(null);
  };
  const resetTenantPermissions = async (tenant: Tenant) => {
    await update(tenant.id, { permissions: tenant.defaultPermissions || [], permissionsCustomized: false });
    message.success('已恢复套餐默认权限');
  };

  const logout = () => {
    localStorage.removeItem('mercivo_access_token');
    localStorage.removeItem('mercivo_user');
    localStorage.removeItem('mercivo_tenant');
    window.location.assign('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', label: <span className="text-red-500">退出登录</span> },
  ];

  const filteredTenants = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return tenants.filter(item => (statusFilter === 'all' || item.status === statusFilter) && (planFilter === 'all' || item.plan === planFilter) && (!query || item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)));
  }, [keyword, planFilter, statusFilter, tenants]);

  if (!MODULE_IDS.has(module)) return <Navigate to="/system/overview" replace />;

  const merchantColumns: ColumnsType<Tenant> = [
    {
      title: '商户信息', key: 'tenant', width: 230,
      render: (_, row) => <div className="flex items-center gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{row.name.slice(0, 1)}</div><div><div className="text-sm font-semibold text-foreground">{row.name}</div><div className="mt-0.5 font-mono text-xs text-muted-foreground">{row.slug}</div></div></div>,
    },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (value, row) => <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${value === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{value === 'active' ? '正常' : '停用'}</span><Switch size="small" checked={value === 'active'} onChange={checked => void update(row.id, { status: checked ? 'active' : 'suspended' })} /></div>,
    },
    {
      title: '套餐', dataIndex: 'plan', width: 130,
      render: (value, row) => <Select
        size="small"
        value={value}
        className="w-28"
        options={plans.filter(plan => plan.enabled || plan.code === value).map(plan => ({ value: plan.code, label: plan.name }))}
        onChange={plan => void update(row.id, { plan })}
      />,
    },
    {
      title: '业务使用量', key: 'usage',
      render: (_, row) => <div className="flex flex-wrap gap-1.5">{[['商品', row.usage.products], ['线索', row.usage.leads], ['成员', row.usage.users]].map(([label, value]) => <span key={label} className="rounded-lg bg-secondary/60 px-2 py-1 text-xs text-muted-foreground"><b className="mr-1 font-semibold text-foreground">{value}</b>{label}</span>)}</div>,
    },
    {
      title: '有效期', dataIndex: 'expiresAt', width: 140,
      render: value => {
        const expired = value && new Date(value) < new Date();
        return <span className={`text-xs ${expired ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>{value ? new Date(value).toLocaleDateString('zh-CN') : '长期有效'}</span>;
      },
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 120,
      render: value => <span className="text-xs text-muted-foreground">{new Date(value).toLocaleDateString('zh-CN')}</span>,
    },
    {
      title: '操作', key: 'actions', width: 100, fixed: 'right',
      render: (_, row) => <button className="text-xs font-medium text-primary" onClick={() => setEditingLifecycle({ ...row })}>运营设置</button>,
    },
  ];

  const permissionColumns: ColumnsType<Tenant> = [
    {
      title: '商户', key: 'tenant', width: 190,
      render: (_, row) => <div><div className="font-semibold text-foreground">{row.name}</div><div className="text-xs text-muted-foreground">{row.plan.toUpperCase()}</div></div>,
    },
    {
      title: '商品配额', key: 'products', width: 170,
      render: (_, row) => <QuotaUsage value={row.maxProducts} used={row.usage.products} />,
    },
    {
      title: '智能体配额', key: 'agents', width: 170,
      render: (_, row) => <QuotaUsage value={row.maxAgents} used={row.usage.agents} />,
    },
    {
      title: '成员额度', key: 'members', width: 170,
      render: (_, row) => <QuotaUsage value={row.maxMembers} used={row.usage.users} />,
    },
    {
      title: '配额来源', key: 'quotaMode', width: 130,
      render: (_, row) => <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.quotaMode === 'custom' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{row.quotaMode === 'custom' ? '定制配额' : '套餐默认'}</span>,
    },
    {
      title: '权限来源', key: 'permissionMode', width: 110,
      render: (_, row) => <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.permissionMode === 'custom' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{row.permissionMode === 'custom' ? '商户定制' : '套餐默认'}</span>,
    },
    {
      title: '操作', key: 'actions', width: 250, fixed: 'right',
      render: (_, row) => <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs"><button className="font-medium text-primary" onClick={() => setEditingQuota({ ...row })}>调整配额</button><button className="font-medium text-primary" onClick={() => setEditingPermissions({ ...row, permissions: [...(row.permissions || [])] })}>配置权限</button>{row.quotaMode === 'custom' && <button className="text-muted-foreground hover:text-foreground" onClick={() => void resetQuota(row)}>恢复配额</button>}{row.permissionMode === 'custom' && <button className="text-muted-foreground hover:text-foreground" onClick={() => void resetTenantPermissions(row)}>恢复权限</button>}</div>,
    },
  ];
  const planColumns: ColumnsType<PlanItem> = [
    {
      title: '套餐名称', key: 'name', width: 220,
      render: (_, row) => <div><div className="font-semibold text-foreground">{row.name}</div><div className="mt-0.5 font-mono text-xs text-muted-foreground">{row.code}</div></div>,
    },
    {
      title: '价格', key: 'price', width: 150,
      render: (_, row) => <span className="font-semibold">¥{Number(row.price).toLocaleString()}<span className="ml-1 text-xs font-normal text-muted-foreground">/{row.billingCycle === 'year' ? '年' : '月'}</span></span>,
    },
    { title: '商品配额', dataIndex: 'maxProducts', width: 110, render: value => `${value} 个` },
    { title: '智能体配额', dataIndex: 'maxAgents', width: 120, render: value => `${value} 个` },
    { title: '成员额度', dataIndex: 'maxMembers', width: 110, render: value => `${value} 人` },
    { title: '站点额度', dataIndex: 'maxSites', width: 110, render: value => `${value} 个` },
    { title: '功能权限', key: 'permissions', width: 120, render: (_, row) => `${row.permissions?.length || 0} 项` },
    {
      title: '状态', dataIndex: 'enabled', width: 100,
      render: value => <span className={`rounded-full px-2 py-1 text-xs font-semibold ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{value ? '启用' : '停用'}</span>,
    },
    {
      title: '操作', key: 'actions', width: 100, fixed: 'right',
      render: (_, row) => <button className="text-xs font-medium text-primary" onClick={() => setEditingPlan({ ...row, features: { ...(row.features || {}) }, permissions: [...(row.permissions || [])] })}>编辑</button>,
    },
  ];
  const agentPresetColumns: ColumnsType<AgentPreset> = [
    { title: '模板', key: 'name', render: (_, row) => <div><div className="font-semibold">{row.name}</div><div className="font-mono text-xs text-muted-foreground">{row.code}</div></div> },
    { title: '用途', dataIndex: 'agentType', width: 120, render: value => ({ sales: '询盘', translation: '多语言翻译', sourcing: '选品' }[value as string] || value) },
    { title: '默认模型', dataIndex: 'model', width: 150 },
    { title: '状态', dataIndex: 'enabled', width: 100, render: value => <span className={`rounded-full px-2 py-1 text-xs font-semibold ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{value ? '已上架' : '已下架'}</span> },
    { title: '操作', key: 'action', width: 100, render: (_, row) => <button className="text-xs font-medium text-primary" onClick={() => setEditingAgentPreset({ ...row })}>编辑</button> },
  ];
  const orderColumns: ColumnsType<PlatformOrder> = [
    { title: '订单号', dataIndex: 'orderNo', width: 210, render: value => <span className="font-mono text-xs">{value}</span> },
    { title: '租户', dataIndex: 'tenantId', width: 200, render: value => tenants.find(tenant => tenant.id === value)?.name || value },
    { title: '套餐', dataIndex: 'planName', width: 140 },
    { title: '金额', key: 'amount', width: 130, render: (_, row) => <b>¥{Number(row.amount).toLocaleString('zh-CN')}</b> },
    { title: '订单状态', dataIndex: 'status', width: 110, render: value => value === 'confirmed' ? '已确认' : '已取消' },
    { title: '支付状态', dataIndex: 'paymentStatus', width: 110, render: value => ({ paid: '已支付', pending: '待支付', not_required: '无需支付' }[value as string] || value) },
    { title: '生效时间', dataIndex: 'effectiveAt', width: 130, render: value => new Date(value).toLocaleDateString('zh-CN') },
    { title: '到期时间', dataIndex: 'expiresAt', width: 130, render: value => value ? new Date(value).toLocaleDateString('zh-CN') : '长期有效' },
  ];
  const PIE_COLORS = ['#5b44e8', '#16a34a', '#f59e0b', '#0ea5e9', '#ef4444'];

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-16 shrink-0 select-none items-center gap-5 border-b border-border bg-white px-5 shadow-[0_1px_0_rgba(91,68,232,.07)]">
          <div className="flex flex-shrink-0 items-center gap-2.5">
            <BrandMark size={30} />
            <div><div className="text-sm font-bold leading-tight tracking-tight">迈犀沃</div><div className="text-[10px] leading-tight text-muted-foreground">AI 外贸一体化智能平台</div></div>
          </div>
          <div className="h-6 w-px flex-shrink-0 bg-border" />
          <button className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary/10 px-3.5 py-1.5 text-sm font-semibold text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />平台管理
          </button>
        <div className="flex-1" />
        <div style={{ width: 320 }}><Input placeholder="搜索平台功能、商户..." prefix={<Search className="h-4 w-4 text-muted-foreground" />} suffix={<kbd className="rounded border border-border bg-white px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘K</kbd>} variant="filled" /></div>
        <button className="relative flex-shrink-0 rounded-xl p-2 transition-colors hover:bg-secondary"><Bell className="h-4 w-4 text-muted-foreground" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-red-500" /></button>
      </header>

      <div className="flex min-h-0 flex-1">
      <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-border" style={{ background: 'var(--sidebar)' }}>
        <nav className="flex-1 space-y-5 overflow-auto px-3 py-4">
          {MENU_GROUPS.map(group => <div key={group.label}>
            <button onClick={() => toggleGroup(group.label)} className="flex w-full items-center justify-between px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-foreground/60 transition-colors hover:text-foreground/80">
              <span>{group.label}</span>{collapsedGroups[group.label] ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {!collapsedGroups[group.label] && <div className="space-y-0.5">{group.items.map(item => {
              const Icon = item.icon; const active = module === item.id;
              return <button key={item.id} onClick={() => navigate(`/system/${item.id}`)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary shadow-none' : 'text-foreground/80 hover:bg-secondary hover:text-foreground'}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} /><span className="flex-1 text-left">{item.label}</span>
              </button>;
            })}</div>}
          </div>)}
        </nav>
        <div className="border-t border-border p-3">
          <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') logout(); } }} placement="topLeft" trigger={['click']}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-primary/20">管</div>
              <div className="min-w-0 flex-1 text-left"><div className="text-sm font-semibold text-foreground">系统管理员</div><div className="truncate text-xs text-muted-foreground">{(() => { try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}').account || 'admin'; } catch { return 'admin'; } })()}</div></div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </Dropdown>
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-auto p-6">
          {module === 'overview' && <div className="space-y-5">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-foreground">全商户运营概览</h2><p className="mt-0.5 text-sm text-muted-foreground">监控平台规模、业务使用量和商户运行状态</p></div><button disabled={loading} onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{loading ? '刷新中...' : '数据刷新'}</button></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard label="商户总数" value={overview?.totalTenants} icon={Building2} tone="bg-primary/10 text-primary" detail={`${overview?.activeTenants || 0} 家正常运营`} />
              <StatCard label="商品总数" value={overview?.totalProducts} icon={Package} tone="bg-amber-50 text-amber-600" detail="平台在管商品数据" />
              <StatCard label="线索 / 账号" value={`${overview?.totalLeads || 0} / ${overview?.totalUsers || 0}`} icon={Users} tone="bg-emerald-50 text-emerald-600" detail="累计线索与商户成员" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs text-amber-700">7 天内到期</div><div className="mt-1 text-xl font-bold text-amber-800">{analytics?.lifecycle.expiring || 0}</div></div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4"><div className="text-xs text-red-700">已过期租户</div><div className="mt-1 text-xl font-bold text-red-700">{analytics?.lifecycle.expired || 0}</div></div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4"><div className="text-xs text-violet-700">配额预警租户</div><div className="mt-1 text-xl font-bold text-violet-700">{analytics?.utilization.quotaWarningTenants || 0}</div></div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><div className="text-xs text-blue-700">已发布站点</div><div className="mt-1 text-xl font-bold text-blue-700">{analytics?.business.publishedSites || 0}</div></div>
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
                <div className="mb-4"><h3 className="text-sm font-bold">商户业务概览</h3><p className="mt-1 text-xs text-muted-foreground">按商品与线索规模查看平台使用情况</p></div>
                <Table rowKey="id" loading={loading} dataSource={tenants.slice(0, 6)} columns={merchantColumns.slice(0, 4)} pagination={false} scroll={{ x: 760 }} />
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
                <h3 className="text-sm font-bold">平台运行状态</h3>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4"><div className="flex items-center gap-3"><ShieldCheck className="text-emerald-600" size={18} /><div><div className="text-xs font-bold text-emerald-800">正常商户</div><div className="text-[10px] text-emerald-600">当前可正常访问</div></div></div><b className="text-lg text-emerald-700">{overview?.activeTenants || 0}</b></div>
                  <div className="flex items-center justify-between rounded-xl bg-red-50 p-4"><div className="flex items-center gap-3"><KeyRound className="text-red-500" size={18} /><div><div className="text-xs font-bold text-red-800">停用商户</div><div className="text-[10px] text-red-500">已暂停平台权限</div></div></div><b className="text-lg text-red-600">{overview?.suspendedTenants || 0}</b></div>
                </div>
              </div>
            </div>
          </div>}

          {module === 'analytics' && <div className="space-y-5">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">平台多维分析</h2><p className="mt-0.5 text-sm text-muted-foreground">从增长、转化、资源使用和功能采用中发现续费风险与产品需求</p></div><button disabled={loading} onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />刷新数据</button></div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
              <StatCard label="独立站" value={analytics?.business.sites} icon={Globe2} tone="bg-blue-50 text-blue-600" detail={`${analytics?.business.publishedSites || 0} 个已发布`} />
              <StatCard label="客户" value={analytics?.business.customers} icon={Users} tone="bg-emerald-50 text-emerald-600" detail={`线索转化率 ${analytics?.conversion.leadRate || 0}%`} />
              <StatCard label="商机" value={analytics?.business.opportunities} icon={Target} tone="bg-violet-50 text-violet-600" detail={`赢单率 ${analytics?.conversion.opportunityWinRate || 0}%`} />
              <StatCard label="触达任务" value={analytics?.business.campaigns} icon={Activity} tone="bg-amber-50 text-amber-600" detail="开发信任务总量" />
              <StatCard label="知识文件" value={analytics?.business.knowledgeFiles} icon={Database} tone="bg-cyan-50 text-cyan-600" detail="AI 知识资产" />
              <StatCard label="确认订单金额" value={`¥${Number(analytics?.business.confirmedRevenue || 0).toLocaleString('zh-CN')}`} icon={CreditCard} tone="bg-rose-50 text-rose-600" detail="累计确认订阅订单" />
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><div className="mb-4"><b>租户增长趋势</b><p className="text-xs text-muted-foreground">近 12 个月新增及累计租户</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics?.tenantGrowth || []}><defs><linearGradient id="growth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5b44e8" stopOpacity={0.35}/><stop offset="95%" stopColor="#5b44e8" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" fontSize={11}/><YAxis allowDecimals={false} fontSize={11}/><Tooltip/><Area type="monotone" dataKey="cumulative" name="累计租户" stroke="#5b44e8" fill="url(#growth)"/><Bar dataKey="count" name="新增租户" fill="#a89af7"/></AreaChart></ResponsiveContainer></div></div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><div className="mb-4"><b>套餐分布</b><p className="text-xs text-muted-foreground">识别主力套餐和升级空间</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics?.planDistribution || []} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={({ name, value }) => `${name} ${value}`} >{(analytics?.planDistribution || []).map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
            </div>
            <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><b>资源利用率与定制信号</b><div className="mt-5 space-y-4">{([['商品配额', analytics?.utilization.products || 0], ['智能体配额', analytics?.utilization.agents || 0], ['成员额度', analytics?.utilization.members || 0]] as const).map(([label, value]) => <div key={label}><div className="mb-1.5 flex justify-between text-xs"><span>{label}</span><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }}/></div></div>)}</div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-amber-50 p-3"><div className="text-xs text-amber-700">定制配额</div><b className="text-lg text-amber-800">{analytics?.customization.customQuotaTenants || 0} 家</b></div><div className="rounded-lg bg-violet-50 p-3"><div className="text-xs text-violet-700">定制权限</div><b className="text-lg text-violet-800">{analytics?.customization.customPermissionTenants || 0} 家</b></div></div></div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><div className="mb-4"><b>活跃租户排行</b><p className="text-xs text-muted-foreground">综合商品、线索、智能体和成员使用量</p></div><Table rowKey="id" size="small" dataSource={analytics?.topTenants || []} pagination={false} columns={[{ title: '租户', dataIndex: 'name' }, { title: '套餐', dataIndex: 'planName' }, { title: '站点', dataIndex: 'sites' }, { title: '商品', dataIndex: 'products' }, { title: '线索', dataIndex: 'leads' }, { title: '活跃度', dataIndex: 'activityScore', render: value => <b className="text-primary">{value}</b> }]}/></div>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 shadow-sm"><div className="mb-4"><b>功能采用情况</b><p className="text-xs text-muted-foreground">权限开通租户数可作为产品需求热度和套餐设计依据</p></div><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={(analytics?.customization.permissionDemand || []).filter(item => item.key.startsWith('menu.')).slice(0, 12)} margin={{ left: 35 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={90} fontSize={11}/><Tooltip/><Bar dataKey="enabledTenants" name="开通租户" fill="#5b44e8" radius={[0, 4, 4, 0]}/></BarChart></ResponsiveContainer></div></div>
          </div>}

          {module === 'orders' && <div className="space-y-5"><div><h2 className="text-xl font-bold">订阅订单</h2><p className="mt-0.5 text-sm text-muted-foreground">统一核对租户套餐订阅、生效周期和支付状态</p></div><div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"><Table rowKey="id" loading={loading} dataSource={orders} columns={orderColumns} scroll={{ x: 1150 }} pagination={{ pageSize: 12, showTotal: total => `共 ${total} 笔订单` }}/></div></div>}

          {module === 'plans' && <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold text-foreground">套餐管理</h2><p className="mt-0.5 text-sm text-muted-foreground">维护套餐价格、商品与智能体配额及功能权限</p></div>
              <button onClick={() => setEditingPlan({ id: '', code: '', name: '', price: 0, currency: 'CNY', billingCycle: 'month', description: '', maxProducts: 1, maxAgents: 0, maxMembers: 1, maxSites: 1, features: {}, permissions: [], enabled: true, sortOrder: plans.length })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">新增套餐</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <Table rowKey="id" loading={loading} dataSource={plans} columns={planColumns} scroll={{ x: 940 }} pagination={false} />
            </div>
          </div>}

          {module === 'agent-presets' && <div className="space-y-5">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">智能体模板</h2><p className="mt-0.5 text-sm text-muted-foreground">统一管理商户可安装的平台预制智能体</p></div><button onClick={() => setEditingAgentPreset({ id: '', code: '', name: '', description: '', agentType: 'sales', model: 'gpt-4o-mini', lang: '多语言', systemPrompt: '', icon: 'Bot', color: 'bg-primary/10 text-primary border-primary/20', enabled: true, sortOrder: agentPresets.length })} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">新增模板</button></div>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"><Table rowKey="id" loading={loading} dataSource={agentPresets} columns={agentPresetColumns} pagination={false} /></div>
          </div>}

          {(module === 'merchants' || module === 'quotas') && <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div><h2 className="text-xl font-bold text-foreground">{module === 'merchants' ? '商户管理' : '配额管理'}</h2><p className="mt-0.5 text-sm text-muted-foreground">{module === 'merchants' ? '维护商户状态、所属套餐和业务使用情况' : '默认继承套餐配额，并支持按商户进行定制调整'}</p></div>
              <button disabled={loading} onClick={() => void load()} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />刷新数据</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="max-w-xs flex-1"><Input variant="filled" allowClear prefix={<Search size={14} className="text-muted-foreground" />} placeholder="搜索商户名称或标识" value={keyword} onChange={event => setKeyword(event.target.value)} /></div>
                <Select value={planFilter} onChange={setPlanFilter} className="w-36" options={[{ value: 'all', label: '全部套餐' }, ...plans.map(plan => ({ value: plan.code, label: plan.name }))]}/>
                {module === 'merchants' && <div className="ml-auto flex gap-1 rounded-xl bg-secondary p-1">{([['all', '全部'], ['active', '正常'], ['suspended', '已停用']] as const).map(([value, label]) => <button key={value} onClick={() => setStatusFilter(value)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${statusFilter === value ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{label}<span className="ml-1.5 text-xs">{value === 'all' ? tenants.length : tenants.filter(item => item.status === value).length}</span></button>)}</div>}
                <span className="text-xs text-muted-foreground">共 {filteredTenants.length} 家商户</span>
              </div>
              <Table
                rowKey="id"
                loading={loading}
                dataSource={filteredTenants}
                columns={module === 'merchants' ? merchantColumns : permissionColumns}
                scroll={{ x: module === 'merchants' ? 900 : 1120 }}
                pagination={{ pageSize: 10, showTotal: total => `共 ${total} 家商户` }}
              />
            </div>
          </div>}
      </section>
      </div>
      <Modal open={!!editingLifecycle} title="租户运营设置" okText="保存设置" cancelText="取消" onCancel={() => setEditingLifecycle(null)} onOk={() => void saveLifecycle()}>
        {editingLifecycle && <div className="space-y-5 pt-3">
          <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3"><div className="font-semibold">{editingLifecycle.name}</div><div className="mt-1 font-mono text-xs text-muted-foreground">{editingLifecycle.slug}</div></div>
          <div className="grid grid-cols-2 gap-4"><div><div className="mb-2 text-xs font-medium text-muted-foreground">运行状态</div><Select className="w-full" value={editingLifecycle.status} onChange={status => setEditingLifecycle({ ...editingLifecycle, status })} options={[{ value: 'active', label: '正常运营' }, { value: 'suspended', label: '暂停服务' }]}/></div><div><div className="mb-2 text-xs font-medium text-muted-foreground">所属套餐</div><Select className="w-full" value={editingLifecycle.plan} onChange={plan => setEditingLifecycle({ ...editingLifecycle, plan })} options={plans.filter(item => item.enabled || item.code === editingLifecycle.plan).map(item => ({ value: item.code, label: item.name }))}/></div></div>
          <div><div className="mb-2 text-xs font-medium text-muted-foreground">服务到期时间</div><DatePicker className="w-full" showTime value={editingLifecycle.expiresAt ? dayjs(editingLifecycle.expiresAt) : null} placeholder="不设置则保持当前有效期" onChange={value => setEditingLifecycle({ ...editingLifecycle, expiresAt: value?.toISOString() || null })}/><p className="mt-2 text-xs text-muted-foreground">到期后租户登录将被拦截；续费时可直接延长该时间。</p></div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5"/>切换套餐会恢复该套餐的默认配额和权限，已有商户定制项将被覆盖。</div>
        </div>}
      </Modal>
      <Modal open={!!editingQuota} title="定制商户配额" okText="保存定制配额" cancelText="取消" onCancel={() => setEditingQuota(null)} onOk={() => void saveQuota()}>
        {editingQuota && <div className="space-y-5 pt-3">
          <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <div className="font-semibold text-foreground">{editingQuota.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">当前套餐：{plans.find(plan => plan.code === editingQuota.plan)?.name || editingQuota.plan}</div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><div className="mb-2 text-xs font-medium text-muted-foreground">商品上限</div><InputNumber className="w-full" min={1} max={1000000} value={editingQuota.maxProducts} onChange={value => setEditingQuota({ ...editingQuota, maxProducts: Number(value) || 1 })} /></div>
            <div><div className="mb-2 text-xs font-medium text-muted-foreground">智能体上限</div><InputNumber className="w-full" min={0} max={1000} value={editingQuota.maxAgents} onChange={value => setEditingQuota({ ...editingQuota, maxAgents: Number(value) || 0 })} /></div>
            <div><div className="mb-2 text-xs font-medium text-muted-foreground">成员上限</div><InputNumber className="w-full" min={1} max={10000} value={editingQuota.maxMembers} onChange={value => setEditingQuota({ ...editingQuota, maxMembers: Number(value) || 1 })} /></div>
            <div><div className="mb-2 text-xs font-medium text-muted-foreground">站点上限</div><InputNumber className="w-full" min={1} max={1000} value={editingQuota.maxSites} onChange={value => setEditingQuota({ ...editingQuota, maxSites: Number(value) || 1 })} /></div>
          </div>
          {editingQuota.defaultQuota && <div className="text-xs text-muted-foreground">套餐默认：商品 {editingQuota.defaultQuota.maxProducts}、智能体 {editingQuota.defaultQuota.maxAgents}、成员 {editingQuota.defaultQuota.maxMembers}、站点 {editingQuota.defaultQuota.maxSites}</div>}
        </div>}
      </Modal>
      <Modal open={!!editingPermissions} title="商户定制权限" width={880} okText="保存定制权限" cancelText="取消" onCancel={() => setEditingPermissions(null)} onOk={() => void saveTenantPermissions()}>{editingPermissions && <div className="space-y-4 pt-3"><div className="rounded-xl border border-border bg-secondary/30 p-4"><div className="font-semibold">{editingPermissions.name}</div><div className="mt-1 text-xs text-muted-foreground">成员只能被分配此处已开通的权限。当前已选 {editingPermissions.permissions?.length || 0} 项。</div></div><div className="max-h-[55vh] space-y-3 overflow-auto rounded-xl border border-border bg-secondary/20 p-4">{permissionCatalog.filter(item => item.level === 'primary').map(primary => <div key={primary.key} className="rounded-xl border border-border bg-white p-4"><Checkbox checked={editingPermissions.permissions?.includes(primary.key)} onChange={e => setEditingPermissions({ ...editingPermissions, permissions: updatePermissionSelection(editingPermissions.permissions || [], primary.key, e.target.checked) })}><b className="text-sm">{primary.label}</b></Checkbox><div className="mt-3 space-y-3 border-l-2 border-primary/10 pl-5">{permissionCatalog.filter(item => item.level === 'secondary' && item.parentKey === primary.key).map(secondary => <div key={secondary.key}><Checkbox checked={editingPermissions.permissions?.includes(secondary.key)} onChange={e => setEditingPermissions({ ...editingPermissions, permissions: updatePermissionSelection(editingPermissions.permissions || [], secondary.key, e.target.checked) })}><span className="text-sm font-semibold">{secondary.label}</span></Checkbox><div className="mt-2 grid grid-cols-3 gap-2 pl-6">{permissionCatalog.filter(item => item.level === 'button' && item.parentKey === secondary.key).map(button => <Checkbox key={button.key} checked={editingPermissions.permissions?.includes(button.key)} onChange={e => setEditingPermissions({ ...editingPermissions, permissions: updatePermissionSelection(editingPermissions.permissions || [], button.key, e.target.checked) })}><span className="text-xs">{button.label}</span></Checkbox>)}</div></div>)}</div></div>)}</div></div>}</Modal>
      <Modal open={!!editingPlan} title={editingPlan?.id ? '编辑套餐' : '新建套餐'} width={880} okText="保存套餐" cancelText="取消" onCancel={() => setEditingPlan(null)} onOk={() => void savePlan()}>{editingPlan && <div className="space-y-5 pt-3"><div className="grid grid-cols-3 gap-3"><Input value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} placeholder="套餐名称"/><Input disabled={!!editingPlan.id} value={editingPlan.code} onChange={e => setEditingPlan({ ...editingPlan, code: e.target.value })} placeholder="套餐编码"/><InputNumber className="w-full" min={0} value={editingPlan.price} onChange={price => setEditingPlan({ ...editingPlan, price: Number(price) || 0 })} addonBefore="¥" addonAfter="/月"/></div><div className="mb-5"><Input value={editingPlan.description} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} placeholder="套餐说明"/></div><div className="grid grid-cols-4 gap-3"><InputNumber className="w-full" min={1} value={editingPlan.maxProducts} onChange={value => setEditingPlan({ ...editingPlan, maxProducts: Number(value) || 1 })} addonBefore="商品"/><InputNumber className="w-full" min={0} value={editingPlan.maxAgents} onChange={value => setEditingPlan({ ...editingPlan, maxAgents: Number(value) || 0 })} addonBefore="智能体"/><InputNumber className="w-full" min={1} value={editingPlan.maxMembers} onChange={value => setEditingPlan({ ...editingPlan, maxMembers: Number(value) || 1 })} addonBefore="成员"/><InputNumber className="w-full" min={1} value={editingPlan.maxSites} onChange={value => setEditingPlan({ ...editingPlan, maxSites: Number(value) || 1 })} addonBefore="站点"/></div><div><Checkbox checked={editingPlan.enabled} onChange={e => setEditingPlan({ ...editingPlan, enabled: e.target.checked })}>上架套餐</Checkbox></div><div><div className="mb-3 flex items-center justify-between"><b className="text-sm">一级菜单 / 二级菜单 / 内部按钮</b><button onClick={() => setEditingPlan({ ...editingPlan, permissions: editingPlan.permissions.length === permissionCatalog.length ? [] : permissionCatalog.map(item => item.key) })} className="text-xs text-primary">{editingPlan.permissions.length === permissionCatalog.length ? '取消全选' : '全选'}</button></div><div className="max-h-96 space-y-3 overflow-auto rounded-xl border border-border bg-secondary/20 p-4">{permissionCatalog.filter(item => item.level === 'primary').map(primary => <div key={primary.key} className="rounded-xl border border-border bg-white p-4"><Checkbox checked={editingPlan.permissions.includes(primary.key)} onChange={e => togglePlanPermission(primary.key, e.target.checked)}><b className="text-sm">{primary.label}</b><span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">一级菜单</span></Checkbox><div className="mt-3 space-y-3 border-l-2 border-primary/10 pl-5">{permissionCatalog.filter(item => item.level === 'secondary' && item.parentKey === primary.key).map(secondary => <div key={secondary.key}><Checkbox checked={editingPlan.permissions.includes(secondary.key)} onChange={e => togglePlanPermission(secondary.key, e.target.checked)}><span className="text-sm font-semibold">{secondary.label}</span><span className="ml-2 text-[10px] text-muted-foreground">二级菜单</span></Checkbox><div className="mt-2 grid grid-cols-3 gap-2 pl-6">{permissionCatalog.filter(item => item.level === 'button' && item.parentKey === secondary.key).map(button => <Checkbox key={button.key} checked={editingPlan.permissions.includes(button.key)} onChange={e => togglePlanPermission(button.key, e.target.checked)}><span className="text-xs">{button.label}</span></Checkbox>)}</div></div>)}</div></div>)}</div></div></div>}</Modal>
      <Modal
        open={!!editingAgentPreset}
        title={editingAgentPreset?.id ? '编辑智能体模板' : '新增智能体模板'}
        width={920}
        okText="保存模板"
        cancelText="取消"
        onCancel={() => setEditingAgentPreset(null)}
        onOk={() => void saveAgentPreset()}
      >
        {editingAgentPreset && <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1 pt-3">
          <section className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="mb-4"><h4 className="text-sm font-bold">基础信息</h4><p className="mt-1 text-xs text-muted-foreground">用于租户安装模板时识别用途，模板编码创建后不可修改。</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="mb-1.5 block text-xs font-semibold">模板名称 <span className="text-red-500">*</span></label><Input value={editingAgentPreset.name} maxLength={120} showCount onChange={e => setEditingAgentPreset({ ...editingAgentPreset, name: e.target.value })} placeholder="例如：外贸询盘接待助手"/></div>
              <div><label className="mb-1.5 block text-xs font-semibold">模板编码 <span className="text-red-500">*</span></label><Input disabled={!!editingAgentPreset.id} value={editingAgentPreset.code} maxLength={60} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, code: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })} placeholder="例如：sales-inquiry"/><p className="mt-1 text-[11px] text-muted-foreground">仅支持字母、数字、短横线和下划线</p></div>
            </div>
            <div className="mt-4"><label className="mb-1.5 block text-xs font-semibold">功能说明</label><Input.TextArea rows={3} maxLength={500} showCount value={editingAgentPreset.description} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, description: e.target.value })} placeholder="说明适用场景、核心能力和租户安装后的效果"/></div>
          </section>

          <section className="rounded-xl border border-border bg-white p-4">
            <div className="mb-4"><h4 className="text-sm font-bold">运行配置</h4><p className="mt-1 text-xs text-muted-foreground">这些参数会复制到租户安装后的智能体，租户可在智能体中心继续调整。</p></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="mb-1.5 block text-xs font-semibold">业务类型</label><Select className="w-full" value={editingAgentPreset.agentType} onChange={agentType => setEditingAgentPreset({ ...editingAgentPreset, agentType })} options={[{ value: 'sales', label: '询盘接待' }, { value: 'translation', label: '多语言翻译' }, { value: 'sourcing', label: '智能选品' }]}/></div>
              <div><label className="mb-1.5 block text-xs font-semibold">默认模型</label><Input value={editingAgentPreset.model} maxLength={100} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, model: e.target.value })} placeholder="例如：gpt-4o-mini"/></div>
              <div><label className="mb-1.5 block text-xs font-semibold">支持语言</label><Input value={editingAgentPreset.lang} maxLength={100} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, lang: e.target.value })} placeholder="例如：中文、英文"/></div>
            </div>
            <div className="mt-4"><div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-semibold">默认系统提示词</label><span className="text-[11px] text-muted-foreground">{editingAgentPreset.systemPrompt?.length || 0} 字</span></div><Input.TextArea rows={7} value={editingAgentPreset.systemPrompt || ''} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, systemPrompt: e.target.value })} placeholder="定义智能体角色、业务边界、回复风格、信息收集要求和禁止事项"/></div>
          </section>

          <section className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="mb-4"><h4 className="text-sm font-bold">展示与发布</h4><p className="mt-1 text-xs text-muted-foreground">控制模板在租户智能体市场中的排序、图标样式和可用状态。</p></div>
            <div className="grid grid-cols-[1fr_1.6fr_1fr] gap-4">
              <div><label className="mb-1.5 block text-xs font-semibold">图标名称</label><Input value={editingAgentPreset.icon} maxLength={100} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, icon: e.target.value })} placeholder="Bot"/></div>
              <div><label className="mb-1.5 block text-xs font-semibold">颜色样式</label><Input value={editingAgentPreset.color} maxLength={200} onChange={e => setEditingAgentPreset({ ...editingAgentPreset, color: e.target.value })} placeholder="Tailwind 颜色类"/></div>
              <div><label className="mb-1.5 block text-xs font-semibold">展示顺序</label><InputNumber className="w-full" min={0} max={9999} value={editingAgentPreset.sortOrder} onChange={value => setEditingAgentPreset({ ...editingAgentPreset, sortOrder: Number(value) || 0 })}/></div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3"><div><div className="text-sm font-semibold">允许租户安装</div><p className="mt-0.5 text-xs text-muted-foreground">关闭后仅下架模板，不影响租户已经安装的智能体。</p></div><Switch checked={editingAgentPreset.enabled} onChange={enabled => setEditingAgentPreset({ ...editingAgentPreset, enabled })}/></div>
          </section>
        </div>}
      </Modal>
    </main>
  );
};

export default SystemAdminPage;
