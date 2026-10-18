import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  BookOpen,
  ChevronDown,
  Settings,
  KeyRound,
  LayoutDashboard,
  Package,
  Globe,
  Tags,
  ContactRound,
} from 'lucide-react';
import { BrandMark, ChangePasswordModal } from '../shared';
import { can } from '../../utils/permissions';

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
    label: '站点设计',
    activeCls: 'bg-primary/10 text-primary',
    dotCls: 'bg-primary',
    pages: [{ id: 'site-editor', label: '站点设计', icon: Globe }],
  },
];

// ─────────────── Notification Data ───────────────

// ─────────────── DemoNav (Top Navigation Bar) ───────────────

const DemoNav: React.FC = () => {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [, setIdentityVersion] = useState(0);
  useEffect(() => {
    const refreshIdentity = () => setIdentityVersion(version => version + 1);
    window.addEventListener('mercivo-user-updated', refreshIdentity);
    return () => window.removeEventListener('mercivo-user-updated', refreshIdentity);
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = getPageId(location.pathname);
  const visibleNavGroups = NAV_GROUPS.filter(group => group.id !== 'site' || can('page.site.editor'));

  const activeGroupId = useMemo(
    () => visibleNavGroups.find(g => g.pages.some(p => p.id === activePage))?.id ?? visibleNavGroups[0]?.id ?? '',
    [activePage, visibleNavGroups],
  );

  const handleNav = (pageId: string) => {
    const route = PAGE_ROUTES[pageId];
    if (route) navigate(route);
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'settings', label: '账号信息', icon: <Settings className="w-3.5 h-3.5" /> },
    { key: 'change-password', label: '修改密码', icon: <KeyRound className="w-3.5 h-3.5" /> },
    { type: 'divider' },
    { key: 'logout', label: <span className="text-red-500">退出登录</span> },
  ];
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}') as { account?: string; name?: string; role?: string }; }
    catch { return {}; }
  })();
  const storedTenant = (() => {
    try { return JSON.parse(localStorage.getItem('mercivo_tenant') || '{}') as { name?: string }; }
    catch { return {}; }
  })();
  const accountName = storedUser.role === 'admin' ? storedTenant.name || '商户管理员' : storedUser.name || storedUser.account || '成员账号';

  return (
    <div className="flex-shrink-0 bg-white border-b border-border select-none" style={{ boxShadow: '0 1px 0 rgba(91,68,232,0.07)' }}>

      {/* Row 1: Brand | divider | Group switcher | spacer | Help + Utilities */}
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
          {visibleNavGroups.map(group => {
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

        {/* Help manual */}
        <Tooltip title="使用手册">
          <button
            type="button"
            aria-label="打开使用手册"
            onClick={() => navigate('/help')}
            className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg transition-colors ${location.pathname === '/help' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-primary'}`}
          >
            <BookOpen className="h-4.5 w-4.5" />
          </button>
        </Tooltip>

        {/* User Avatar */}
        <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') { localStorage.removeItem('mercivo_access_token'); localStorage.removeItem('mercivo_user'); localStorage.removeItem('mercivo_tenant'); window.location.assign('/login'); } else if (key === 'change-password') setPasswordModalOpen(true); else handleNav(key); } }} trigger={['click']} placement="bottomRight">
          <button className="flex items-center gap-2 hover:bg-secondary rounded-xl px-1.5 py-1 transition-colors flex-shrink-0">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-bold text-white ring-2 ring-primary/20">{accountName.slice(-2)}</span>
            <span className="max-w-36 truncate text-xs font-semibold text-foreground">{accountName}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </Dropdown>
      </div>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />

    </div>
  );
};

export default DemoNav;
