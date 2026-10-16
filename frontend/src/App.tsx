import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { ConfigProvider } from "antd";
import antdZhCN from "antd/locale/zh_CN";
import AdminLayout from "./components/layout/AdminLayout";
import DemoNav from "./components/layout/DemoNav";
import { can } from "./utils/permissions";
import { firstAuthorizedRoute } from "./utils/navigation";
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const ProductsPage = lazy(() => import("./pages/Products"));
const ProductEditPage = lazy(() => import("./pages/ProductEdit"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetail"));
const SiteEditorPage = lazy(() => import("./pages/SiteEditor"));
const SitePreviewPage = lazy(() => import("./pages/SitePreview"));
const CustomerLevelsPage = lazy(() => import("./pages/CustomerLevels"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ProductCategoriesPage = lazy(() => import("./pages/ProductCategories"));
const InventoryPage = lazy(() => import("./pages/Inventory"));
const SalesPage = lazy(() => import("./pages/Sales"));
const PurchasePage = lazy(() => import("./pages/Purchase"));
const FinancePage = lazy(() => import("./pages/Finance"));
const SystemSettingsPage = lazy(() => import("./pages/SystemSettings"));
const LoginPage = lazy(() => import("./pages/Login"));
const SystemAdminPage = lazy(() => import("./pages/SystemAdmin"));
const StorefrontPage = lazy(() => import("./pages/Storefront"));
const TranslationsPage = lazy(() => import("./pages/Translations"));

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

const Protected = () =>
  localStorage.getItem("mercivo_access_token") ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
const currentRole = () => {
  try {
    return JSON.parse(localStorage.getItem("mercivo_user") || "{}")
      .role as string;
  } catch {
    return "";
  }
};
const TenantOnly = () =>
  currentRole() === "system_admin" ? (
    <Navigate to="/system" replace />
  ) : (
    <Outlet />
  );
const SystemOnly = () =>
  currentRole() === "system_admin" ? (
    <Outlet />
  ) : (
    <Navigate to={firstAuthorizedRoute(currentPermissionsFromStorage())} replace />
  );
const currentPermissionsFromStorage = () => {
  try { return JSON.parse(localStorage.getItem("mercivo_tenant") || "{}").permissions || []; }
  catch { return []; }
};
const TenantHome = () => <Navigate to={firstAuthorizedRoute(currentPermissionsFromStorage())} replace />;
const PermissionDenied = () => (
  <div className="grid min-h-[50vh] place-items-center">
    <div className="text-center">
      <div className="text-lg font-bold">暂无访问权限</div>
      <p className="mt-2 text-sm text-muted-foreground">
        请联系商户管理员或检查当前套餐权限。
      </p>
    </div>
  </div>
);
const RequirePermission: React.FC<{
  permission: string;
  children: React.ReactElement;
}> = ({ permission, children }) =>
  can(permission) ? children : <PermissionDenied />;
const SettingsRoute = () => {
  const tab = new URLSearchParams(useLocation().search).get("tab");
  if (tab === "site" || tab === "seo")
    return <Navigate to="/site-editor" replace />;
  if (!tab || tab === "account") return <SettingsPage />;
  const permission = tab === "team" ? "page.settings.team" : "page.settings.account";
  return (
    <RequirePermission permission={permission}>
      <SettingsPage />
    </RequirePermission>
  );
};
const InventoryRoute = () => {
  const { module } = useParams<{ module: string }>();
  const permissions: Record<string, string> = {
    stocks: "page.inventory.stocks",
    counts: "page.inventory.counts",
    transfers: "page.inventory.transfers",
    warehouses: "page.inventory.warehouses",
  };
  const permission = permissions[module || ""];
  return permission ? (
    <RequirePermission permission={permission}>
      <InventoryPage />
    </RequirePermission>
  ) : (
    <Navigate to="/inventory/stocks" replace />
  );
};
const SalesRoute = () => {
  const { module } = useParams<{ module: string }>();
  const permissions: Record<string, string> = {
    orders: "page.sales.orders",
    shipments: "page.sales.shipments",
  };
  const permission = permissions[module || ""];
  return permission ? (
    <RequirePermission permission={permission}>
      <SalesPage />
    </RequirePermission>
  ) : (
    <Navigate to="/sales/orders" replace />
  );
};
const PurchaseRoute = () => {
  const { module } = useParams<{ module: string }>();
  const permissions: Record<string, string> = {
    orders: "page.purchase.orders",
    receipts: "page.purchase.receipts",
    suppliers: "page.purchase.suppliers",
  };
  const permission = permissions[module || ""];
  return permission ? (
    <RequirePermission permission={permission}>
      <PurchasePage />
    </RequirePermission>
  ) : (
    <Navigate to="/purchase/orders" replace />
  );
};
const FinanceRoute = () => {
  const { module } = useParams<{ module: string }>();
  const permissions: Record<string, string> = {
    receipts: "page.finance.receipts",
    payments: "page.finance.payments",
    statistics: "page.finance.statistics",
  };
  const permission = permissions[module || ""];
  return permission ? (
    <RequirePermission permission={permission}><FinancePage /></RequirePermission>
  ) : <Navigate to="/finance/receipts" replace />;
};
const StorefrontRoute = () => {
  const { module } = useParams<{ module: string }>();
  const permissions: Record<string, string> = {
    leads: "page.storefront.leads",
    products: "page.storefront.products",
    releases: "page.storefront.releases",
    settings: "page.site.settings",
  };
  if (module === "settings") return can("page.site.settings") ? <StorefrontPage /> : <PermissionDenied />;
  const permission = permissions[module || ""];
  return permission ? <RequirePermission permission={permission}><StorefrontPage /></RequirePermission> : <Navigate to="/storefront/leads" replace />;
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={antdZhCN}
      theme={{
        token: {
          colorPrimary: "#7C6EF5",
          borderRadius: 12,
          controlHeight: 36,
          controlHeightSM: 28,
          controlHeightLG: 42,
          lineHeight: 1.55,
          fontFamily:
            "Inter, 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
        <Suspense
          fallback={
            <div className="h-screen grid place-items-center text-gray-500">
              加载中…
            </div>
          }
        >
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route element={<Protected />}>
              <Route element={<SystemOnly />}>
                <Route
                  path="system"
                  element={<Navigate to="/system/overview" replace />}
                />
                <Route
                  path="system/permissions"
                  element={<Navigate to="/system/quotas" replace />}
                />
                <Route path="system/:module" element={<SystemAdminPage />} />
              </Route>
              <Route element={<TenantOnly />}>
                <Route path="site-preview" element={<RequirePermission permission="page.site.editor"><SitePreviewPage /></RequirePermission>} />
                <Route element={<AppLayout />}>
                  {/* Backend pages with sidebar */}
                  <Route element={<BackendLayout />}>
                    <Route index element={<TenantHome />} />
                    <Route path="no-access" element={<PermissionDenied />} />
                    <Route
                      path="dashboard"
                      element={
                        <RequirePermission permission="page.dashboard">
                          <DashboardPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="products"
                      element={
                        <RequirePermission permission="page.products">
                          <ProductsPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="products/new"
                      element={
                        <RequirePermission permission="product.create">
                          <ProductEditPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="products/:id/edit"
                      element={
                        <RequirePermission permission="product.edit">
                          <ProductEditPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="customer"
                      element={
                        <RequirePermission permission="page.customers">
                          <CustomerLevelsPage />
                        </RequirePermission>
                      }
                    />
                    <Route path="settings" element={<SettingsRoute />} />
                    <Route
                      path="system-settings"
                      element={
                        <RequirePermission permission="page.settings.account">
                          <SystemSettingsPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="product-categories"
                      element={
                        <RequirePermission permission="page.product-categories">
                          <ProductCategoriesPage />
                        </RequirePermission>
                      }
                    />
                    <Route
                      path="inventory/:module"
                      element={<InventoryRoute />}
                    />
                    <Route path="sales/:module" element={<SalesRoute />} />
                    <Route
                      path="purchase/:module"
                      element={<PurchaseRoute />}
                    />
                    <Route path="finance/:module" element={<FinanceRoute />} />
                    <Route path="storefront/:module" element={<StorefrontRoute />} />
                    <Route path="storefront-translations" element={<RequirePermission permission="page.site.editor"><TranslationsPage /></RequirePermission>} />
                  </Route>
                  {/* Frontend pages without sidebar */}
                  <Route
                    path="site-editor"
                    element={
                      <RequirePermission permission="page.site.editor">
                        <SiteEditorPage />
                      </RequirePermission>
                    }
                  />
                  <Route path="storefront" element={<Navigate to="/storefront/leads" replace />} />
                  <Route
                    path="products/:id"
                    element={
                      <RequirePermission permission="page.products">
                        <ProductDetailPage />
                      </RequirePermission>
                    }
                  />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
