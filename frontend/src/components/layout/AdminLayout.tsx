import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { can } from '../../utils/permissions';
import api from '../../services/api';
import { openPublishedStorefront } from '../../utils/storefront';
import {
  ChevronDown,
  ChevronRight,
  Settings,
  ExternalLink,
  LayoutDashboard,
  Package,
  Globe,
  Users,
  Bot,
  BookOpen,
  ContactRound,
  Handshake,
  MailPlus,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';

// ─────────────── Types ───────────────

interface AdminLayoutProps {
  children: React.ReactNode;
}

// ─────────────── Path to PageId mapping ───────────────

const PATH_PAGE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/products/new': 'product-edit',
  '/leads': 'leads',
  '/customer-levels': 'customer-levels',
  '/opportunities': 'opportunities',
  '/outreach': 'outreach',
  '/ai-center': 'ai-center',
  '/settings': 'settings',
  '/dict-mgmt': 'dict-mgmt',
};

const PAGE_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  products: '/products',
  'product-edit': '/products/new',
  'site-editor': '/site-editor',
  leads: '/leads',
  'customer-levels': '/customer-levels',
  opportunities: '/opportunities',
  outreach: '/outreach',
  'ai-center': '/ai-center',
  settings: '/settings',
  'site-config': '/settings?tab=site',
  'team-management': '/settings?tab=team',
  billing: '/settings?tab=billing',
  'dict-mgmt': '/dict-mgmt',
};

function getPageId(pathname: string, search = ''): string {
  if (pathname === '/settings') {
    const tab = new URLSearchParams(search).get('tab');
    if (tab === 'site' || tab === 'seo') return 'site-config';
    if (tab === 'team') return 'team-management';
    if (tab === 'billing') return 'billing';
  }
  if (PATH_PAGE_MAP[pathname]) return PATH_PAGE_MAP[pathname];
  if (/^\/products\/[^/]+\/edit$/.test(pathname)) return 'product-edit';
  return 'dashboard';
}

// ─────────────── Sidebar Menu Groups ───────────────

const MENU_GROUPS = [
  {
    label: '工作台',
    items: [
      { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
    ],
  },
  {
    label: '外贸 ERP',
    items: [
      { id: 'products', icon: Package, label: '商品管理' },
      { id: 'customer-levels', icon: ContactRound, label: '客户管理' },
    ],
  },
  {
    label: 'CRM 获客',
    items: [
      { id: 'opportunities', icon: Handshake, label: '商机管理' },
      { id: 'outreach', icon: MailPlus, label: '开发信' },
    ],
  },
  {
    label: '独立站',
    items: [
      { id: 'leads', icon: Users, label: '客户线索', badge: 4 },
      { id: 'site-editor', icon: Globe, label: '站点设计' },
      { id: 'site-config', icon: SlidersHorizontal, label: '站点配置' },
    ],
  },
  {
    label: 'AI赋能',
    items: [
      { id: 'ai-center', icon: Bot, label: '智能体中心' },
    ],
  },
  {
    label: '系统管理',
    items: [
      { id: 'settings', icon: Settings, label: '账号设置' },
      { id: 'team-management', icon: Users, label: '成员与权限' },
      { id: 'dict-mgmt', icon: BookOpen, label: '字典管理' },
    ],
  },
] as const;

const MENU_PERMISSIONS: Record<string, string> = { dashboard: 'menu.dashboard', products: 'menu.products', 'customer-levels': 'menu.customers', opportunities: 'menu.opportunities', outreach: 'menu.outreach', leads: 'menu.leads', 'site-editor': 'menu.site', 'site-config': 'menu.site.config', 'ai-center': 'menu.agents', settings: 'menu.settings', 'team-management': 'menu.team', 'dict-mgmt': 'menu.dictionary' };
const GROUP_PERMISSIONS: Record<string, string> = { '工作台': 'group.workspace', '外贸 ERP': 'group.erp', 'CRM 获客': 'group.crm', '独立站': 'group.site', 'AI赋能': 'group.ai', '系统管理': 'group.system' };

// ─────────────── AdminSidebar ───────────────

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = getPageId(location.pathname, location.search);
  const [, setPermissionVersion] = useState(0);
  useEffect(() => {
    api.get<unknown, { permissions?: string[] }>('/auth/me').then(session => {
      const tenant = JSON.parse(localStorage.getItem('mercivo_tenant') || '{}');
      localStorage.setItem('mercivo_tenant', JSON.stringify({ ...tenant, permissions: session.permissions || [] }));
      setPermissionVersion(version => version + 1);
    }).catch(() => undefined);
  }, []);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const defaults = Object.fromEntries(MENU_GROUPS.map(group => [group.label, group.label !== '工作台']));
    try { return { ...defaults, ...JSON.parse(localStorage.getItem('mercivo_menu_collapsed') || '{}') }; } catch { return defaults; }
  });
  const toggleGroup = (label: string) => setCollapsedGroups(current => {
    const next = { ...current, [label]: !current[label] };
    localStorage.setItem('mercivo_menu_collapsed', JSON.stringify(next));
    return next;
  });

  const handleNav = (pageId: string) => {
    if (pageId === 'storefront') {
      void openPublishedStorefront();
      return;
    }
    const route = PAGE_ROUTES[pageId];
    if (route) navigate(route);
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'settings', label: '账号设置', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'storefront', label: '查看前台', icon: <ExternalLink className="w-3.5 h-3.5" /> },
    { key: 'billing', label: '套餐账单', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { type: 'divider' },
    { key: 'logout', label: <span className="text-red-500">退出登录</span> },
  ];
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}') as { account?: string }; } catch { return {}; } })();
  const storedTenant = (() => { try { return JSON.parse(localStorage.getItem('mercivo_tenant') || '{}') as { name?: string }; } catch { return {}; } })();

  return (
    <aside className="w-60 flex flex-col h-full flex-shrink-0 border-r border-border" style={{ background: 'var(--sidebar)' }}>
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-auto space-y-5">
        {MENU_GROUPS.filter(group => can(GROUP_PERMISSIONS[group.label]) && group.items.some(item => can(MENU_PERMISSIONS[item.id]))).map(group => (
          <div key={group.label}>
            <button onClick={() => toggleGroup(group.label)} className="flex w-full items-center justify-between px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-foreground/60 transition-colors hover:text-foreground/80">
              <span>{group.label}</span>{collapsedGroups[group.label] ? <ChevronRight className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
            </button>
            {!collapsedGroups[group.label] && <div className="space-y-0.5">
              {group.items.filter(item => can(MENU_PERMISSIONS[item.id])).map(item => {
                const isActive = activePage === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    aria-label={item.label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                        ? 'bg-primary/10 text-primary shadow-none'
                        : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-primary'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>}
          </div>
        ))}
      </nav>

      {/* Bottom: User */}
      <div className="p-3 border-t border-border">
        <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') { localStorage.removeItem('mercivo_access_token'); localStorage.removeItem('mercivo_user'); localStorage.removeItem('mercivo_tenant'); window.location.assign('/login'); } else handleNav(key); } }} placement="topLeft" trigger={['click']}>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-secondary">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format" alt="Avatar" className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20" />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-foreground">{storedTenant.name || '商户管理员'}</div>
              <div className="text-xs text-muted-foreground truncate">{storedUser.account || '管理员账号'}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </Dropdown>
      </div>
    </aside>
  );
};

// ─────────────── AdminLayout (Main exported component) ───────────────

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-full bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
