import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import antdZhCN from 'antd/locale/zh_CN';
import AdminLayout from './components/layout/AdminLayout';
import DemoNav from './components/layout/DemoNav';
import { can } from './utils/permissions';
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const ProductsPage = lazy(() => import('./pages/Products'));
const ProductEditPage = lazy(() => import('./pages/ProductEdit'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetail'));
const SiteEditorPage = lazy(() => import('./pages/SiteEditor'));
const LeadsPage = lazy(() => import('./pages/Leads'));
const CustomerLevelsPage = lazy(() => import('./pages/CustomerLevels'));
const OpportunitiesPage = lazy(() => import('./pages/Opportunities'));
const OutreachPage = lazy(() => import('./pages/Outreach'));
const AICenterPage = lazy(() => import('./pages/AICenter'));
const AIChatPage = lazy(() => import('./pages/AIChat'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const DictMgmtPage = lazy(() => import('./pages/DictMgmt'));
const LoginPage = lazy(() => import('./pages/Login'));
const SystemAdminPage = lazy(() => import('./pages/SystemAdmin'));

const AppLayout: React.FC = () => (
  <div className="h-screen flex flex-col bg-background overflow-hidden">
    <DemoNav />
    <div className="flex-1 min-h-0 overflow-hidden">
      <Outlet />
    </div>
  </div>
);

const BackendLayout: React.FC = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

const Protected = () => localStorage.getItem('mercivo_access_token') ? <Outlet /> : <Navigate to="/login" replace />;
const currentRole = () => { try { return JSON.parse(localStorage.getItem('mercivo_user') || '{}').role as string; } catch { return ''; } };
const TenantOnly = () => currentRole() === 'system_admin' ? <Navigate to="/system" replace /> : <Outlet />;
const SystemOnly = () => currentRole() === 'system_admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
const PermissionDenied = () => <div className="grid min-h-[50vh] place-items-center"><div className="text-center"><div className="text-lg font-bold">暂无访问权限</div><p className="mt-2 text-sm text-muted-foreground">请联系商户管理员或检查当前套餐权限。</p></div></div>;
const RequirePermission: React.FC<{ permission: string; children: React.ReactElement }> = ({ permission, children }) => can(permission) ? children : <PermissionDenied />;
const SettingsRoute = () => {
  const tab = new URLSearchParams(useLocation().search).get('tab');
  const permission = tab === 'site' || tab === 'seo' ? 'menu.site.config' : tab === 'team' ? 'menu.team' : 'menu.settings';
  return <RequirePermission permission={permission}><SettingsPage /></RequirePermission>;
};

const App: React.FC = () => {
  return (
  <ConfigProvider
    locale={antdZhCN}
    theme={{
      token: {
        colorPrimary: '#7C6EF5',
        borderRadius: 12,
        controlHeight: 36,
        controlHeightSM: 28,
        controlHeightLG: 42,
        lineHeight: 1.55,
        fontFamily: "Inter, 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 13,
      },
      components: {
        Button: { borderRadius: 10 },
        Input: { borderRadius: 10, paddingInline: 12 },
        Select: { borderRadius: 10 },
      },
    }}
  >
    <BrowserRouter>
      <Suspense fallback={<div className="h-screen grid place-items-center text-gray-500">加载中…</div>}><Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<Protected />}>
        <Route element={<SystemOnly />}>
          <Route path="system" element={<Navigate to="/system/overview" replace />} />
          <Route path="system/permissions" element={<Navigate to="/system/quotas" replace />} />
          <Route path="system/:module" element={<SystemAdminPage />} />
        </Route>
        <Route element={<TenantOnly />}>
        <Route element={<AppLayout />}>
          {/* Backend pages with sidebar */}
          <Route element={<BackendLayout />}>
            <Route index element={<RequirePermission permission="menu.dashboard"><DashboardPage /></RequirePermission>} />
            <Route path="dashboard" element={<RequirePermission permission="menu.dashboard"><DashboardPage /></RequirePermission>} />
            <Route path="products" element={<RequirePermission permission="menu.products"><ProductsPage /></RequirePermission>} />
            <Route path="products/new" element={<RequirePermission permission="product.create"><ProductEditPage /></RequirePermission>} />
            <Route path="products/:id/edit" element={<RequirePermission permission="product.edit"><ProductEditPage /></RequirePermission>} />
            <Route path="leads" element={<RequirePermission permission="menu.leads"><LeadsPage /></RequirePermission>} />
            <Route path="customer-levels" element={<RequirePermission permission="menu.customers"><CustomerLevelsPage /></RequirePermission>} />
            <Route path="opportunities" element={<RequirePermission permission="menu.opportunities"><OpportunitiesPage /></RequirePermission>} />
            <Route path="outreach" element={<RequirePermission permission="menu.outreach"><OutreachPage /></RequirePermission>} />
            <Route path="ai-center" element={<RequirePermission permission="menu.agents"><AICenterPage /></RequirePermission>} />
            <Route path="settings" element={<SettingsRoute />} />
            <Route path="dict-mgmt" element={<RequirePermission permission="menu.dictionary"><DictMgmtPage /></RequirePermission>} />
          </Route>
          {/* Frontend pages without sidebar */}
          <Route path="site-editor" element={<RequirePermission permission="menu.site"><SiteEditorPage /></RequirePermission>} />
          <Route path="storefront" element={<Navigate to="/dashboard" replace />} />
          <Route path="products/:id" element={<RequirePermission permission="menu.products"><ProductDetailPage /></RequirePermission>} />
          <Route path="ai-chat" element={<RequirePermission permission="menu.agents"><AIChatPage /></RequirePermission>} />
        </Route>
        </Route>
        </Route>
      </Routes></Suspense>
    </BrowserRouter>
  </ConfigProvider>
  );
};

export default App;
