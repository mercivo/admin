import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  Search,
  Bell,
  ChevronDown,
  Settings,
  ExternalLink,
  LayoutDashboard,
  Package,
  Globe,
  Tags,
  CheckCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  ContactRound,
} from 'lucide-react';
import { BrandMark } from '../shared';
import { openPublishedStorefront } from '../../utils/storefront';

// ─────────────── Path to PageId mapping ───────────────

const PATH_PAGE_MAP: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/products/new': 'product-edit',
  '/customer': 'customer',
  '/settings': 'settings',
  '/product-categories': 'product-categories',
  '/site-editor': 'site-editor',
};

const PAGE_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  products: '/products',
  'product-edit': '/products/new',
  'site-editor': '/site-editor',
  customer: '/customer',
  settings: '/settings',
  'product-categories': '/product-categories',
  'product-detail': '/products/1',
};

function getPageId(pathname: string): string {
  // Check exact match first
  if (PATH_PAGE_MAP[pathname]) return PATH_PAGE_MAP[pathname];
  // Check /products/:id
  if (/^\/products\/[^/]+$/.test(pathname)) return 'product-detail';
  // Check /products/:id/edit
  if (/^\/products\/[^/]+\/edit$/.test(pathname)) return 'product-edit';
  return 'dashboard';
}

// ─────────────── Top Nav Groups ───────────────

const NAV_GROUPS: Array<{
  id: string;
  label: string;
  activeCls: string;
  dotCls: string;
  pages: Array<{ id: string; label: string; icon: React.FC<{ className?: string }> }>;
}> = [
  {
    id: 'erp',
    label: 'ERP 管理',
    activeCls: 'bg-primary/10 text-primary',
    dotCls: 'bg-primary',
    pages: [
      { id: 'dashboard', label: '经营概览', icon: LayoutDashboard },
      { id: 'products', label: '商品列表', icon: Package },
      { id: 'product-categories', label: '商品分类', icon: Tags },
      { id: 'customer', label: '客户管理', icon: ContactRound },
      { id: 'settings', label: '设置', icon: Settings },
    ],
  },
  {
    id: 'site',
    label: '独立站',
    activeCls: 'bg-primary/10 text-primary',
    dotCls: 'bg-primary',
    pages: [{ id: 'site-editor', label: '站点设计', icon: Globe }],
  },
];

// ─────────────── Notification Data ───────────────

const ACTIVITIES = [
  { text: '商品目录已完成同步', time: '2分钟前', color: 'bg-violet-100', icon: Package, iconColor: 'text-violet-600' },
  { text: 'Yuki Tanaka 签订棉质手提袋合同 ¥12,000', time: '1小时前', color: 'bg-emerald-100', icon: CheckCircle, iconColor: 'text-emerald-600' },
  { text: '抽绳袋库存降至预警线以下', time: '2小时前', color: 'bg-amber-100', icon: AlertTriangle, iconColor: 'text-amber-700' },
  { text: 'Emma Clarke 查看了帆布包产品详情', time: '3小时前', color: 'bg-violet-100', icon: Eye, iconColor: 'text-violet-600' },
  { text: '独立站今日访客突破 3,000 人次', time: '5小时前', color: 'bg-rose-100', icon: TrendingUp, iconColor: 'text-rose-600' },
];

// ─────────────── DemoNav (Top Navigation Bar) ───────────────

const DemoNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = getPageId(location.pathname);

  const activeGroupId = useMemo(
    () => NAV_GROUPS.find(g => g.pages.some(p => p.id === activePage))?.id ?? NAV_GROUPS[0].id,
    [activePage],
  );
  const activeGroup = useMemo(
    () => NAV_GROUPS.find(g => g.id === activeGroupId)!,
    [activeGroupId],
  );

  const handleNav = (pageId: string) => {
    if (pageId === 'storefront') {
      void openPublishedStorefront();
      return;
    }
    const route = PAGE_ROUTES[pageId];
    if (route) navigate(route);
  };

  const notifItems: MenuProps['items'] = [
    {
      key: 'header',
      label: (
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-sm text-foreground">通知中心</span>
          <button className="text-xs text-primary hover:underline">全部标记已读</button>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...ACTIVITIES.slice(0, 4).map((a, i) => ({
      key: `notif-${i}`,
      label: (
        <div className="flex items-start gap-3 py-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${a.color}`}>
            <a.icon className={`w-3 h-3 ${a.iconColor}`} />
          </div>
          <div>
            <p className="text-xs text-foreground leading-relaxed">{a.text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
          </div>
        </div>
      ),
    })),
  ];

  const userMenuItems: MenuProps['items'] = [
    { key: 'settings', label: '账号设置', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'storefront', label: '查看前台', icon: <ExternalLink className="w-3.5 h-3.5" /> },
    { type: 'divider' },
    { key: 'logout', label: <span className="text-red-500">退出登录</span> },
  ];

  return (
    <div className="flex-shrink-0 bg-white border-b border-border select-none" style={{ boxShadow: '0 1px 0 rgba(91,68,232,0.07)' }}>

      {/* Row 1: Brand | divider | Group switcher | spacer | Search + Utilities */}
      <div className="flex h-16 items-center gap-5 border-b border-border px-5">

        {/* Brand */}
        <div className="flex h-full flex-shrink-0 items-center gap-3">
          <BrandMark size={30} />
          <div className="flex flex-col justify-center gap-0.5">
            <div className="text-sm font-bold text-foreground leading-tight tracking-tight">迈犀沃</div>
            <div className="text-[10px] text-muted-foreground leading-tight">外贸 ERP 与独立站平台</div>
          </div>
        </div>

        <div className="w-px h-6 bg-border flex-shrink-0" />

        {/* Group switcher */}
        <div className="flex h-full items-center gap-1">
          {NAV_GROUPS.map(group => {
            const isActive = group.id === activeGroupId;
            return (
              <Link
                key={group.id}
                to={PAGE_ROUTES[group.pages[0].id]}
                className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-normal transition-all duration-150 ${
                  isActive
                    ? group.activeCls
                    : 'text-muted-foreground hover:bg-secondary hover:text-primary'
                }`}
              >
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${group.dotCls} ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                {group.label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Global Search */}
        <div style={{ width: 320 }}>
          <Input
            placeholder="搜索商品、客户或站点..."
            prefix={<Search className="w-4 h-4 text-muted-foreground" />}
            suffix={<kbd className="text-[10px] bg-white border border-border px-1.5 py-0.5 rounded text-muted-foreground">⌘K</kbd>}
            variant="filled" size="middle"
          />
        </div>

        {/* Notifications */}
        <Dropdown menu={{ items: notifItems }} trigger={['click']} placement="bottomRight" overlayStyle={{ width: 320 }}>
          <button className="relative p-2 hover:bg-secondary rounded-xl transition-colors flex-shrink-0">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
          </button>
        </Dropdown>

        {/* User Avatar */}
        <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') { localStorage.removeItem('mercivo_access_token'); localStorage.removeItem('mercivo_user'); localStorage.removeItem('mercivo_tenant'); window.location.assign('/login'); } else handleNav(key); } }} trigger={['click']} placement="bottomRight">
          <button className="flex items-center gap-2 hover:bg-secondary rounded-xl px-1.5 py-1 transition-colors flex-shrink-0">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&auto=format" alt="Avatar"
              className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/20" />
            <span className="text-xs font-semibold text-foreground">张经理</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </Dropdown>
      </div>

    </div>
  );
};

export default DemoNav;
