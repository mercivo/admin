import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import { can } from "../../utils/permissions";
import { getCurrentSession } from "../../services/session";
import { ChangePasswordModal } from "../shared/ChangePasswordModal";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  LayoutDashboard,
  Package,
  Users,
  Tags,
  ContactRound,
  CreditCard,
  Boxes,
  ClipboardCheck,
  ArrowLeftRight,
  Warehouse,
  ShoppingCart,
  PackageCheck,
  Truck,
  ClipboardList,
  Contact,
  CircleDollarSign,
  HandCoins,
  ChartNoAxesCombined,
  History,
  LayoutTemplate,
  MessageSquareText,
  SlidersHorizontal,
  Languages,
  KeyRound,
} from "lucide-react";

// ─────────────── Types ───────────────

interface AdminLayoutProps {
  children: React.ReactNode;
}

// ─────────────── Path to PageId mapping ───────────────

const PATH_PAGE_MAP: Record<string, string> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/products": "products",
  "/products/new": "product-edit",
  "/customer": "customer",
  "/settings": "settings",
  "/system-settings": "system-settings",
  "/product-categories": "product-categories",
  "/inventory/stocks": "inventory-stocks",
  "/inventory/counts": "inventory-counts",
  "/inventory/transfers": "inventory-transfers",
  "/inventory/warehouses": "inventory-warehouses",
  "/sales/orders": "sales-orders",
  "/sales/shipments": "sales-shipments",
  "/purchase/orders": "purchase-orders",
  "/purchase/receipts": "purchase-receipts",
  "/purchase/suppliers": "purchase-suppliers",
  "/finance/receipts": "finance-receipts",
  "/finance/payments": "finance-payments",
  "/finance/statistics": "finance-statistics",
  "/storefront/leads": "storefront-leads",
  "/storefront/products": "storefront-products",
  "/storefront/releases": "storefront-releases",
  "/storefront/settings": "storefront-settings",
  "/storefront-translations": "storefront-translations",
  "/site-editor": "storefront-design",
};

const PAGE_ROUTES: Record<string, string> = {
  dashboard: "/dashboard",
  products: "/products",
  "product-edit": "/products/new",
  customer: "/customer",
  settings: "/settings",
  "system-settings": "/system-settings",
  "team-management": "/settings?tab=team",
  billing: "/settings?tab=billing",
  "product-categories": "/product-categories",
  "inventory-stocks": "/inventory/stocks",
  "inventory-counts": "/inventory/counts",
  "inventory-transfers": "/inventory/transfers",
  "inventory-warehouses": "/inventory/warehouses",
  "sales-orders": "/sales/orders",
  "sales-shipments": "/sales/shipments",
  "purchase-orders": "/purchase/orders",
  "purchase-receipts": "/purchase/receipts",
  "purchase-suppliers": "/purchase/suppliers",
  "finance-receipts": "/finance/receipts",
  "finance-payments": "/finance/payments",
  "finance-statistics": "/finance/statistics",
  "storefront-leads": "/storefront/leads",
  "storefront-products": "/storefront/products",
  "storefront-releases": "/storefront/releases",
  "storefront-design": "/site-editor",
  "storefront-settings": "/storefront/settings",
  "storefront-translations": "/storefront-translations",
};

function getPageId(pathname: string, search = ""): string {
  if (pathname === "/settings") {
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "site" || tab === "seo") return "settings";
    if (tab === "team") return "team-management";
    if (tab === "billing") return "billing";
  }
  if (PATH_PAGE_MAP[pathname]) return PATH_PAGE_MAP[pathname];
  if (/^\/products\/[^/]+\/edit$/.test(pathname)) return "product-edit";
  return "dashboard";
}

// ─────────────── Sidebar Menu Groups ───────────────

const MENU_GROUPS = [
  {
    label: "商品管理",
    items: [
      { id: "products", icon: Package, label: "商品列表" },
      { id: "product-categories", icon: Tags, label: "商品分类" },
    ],
  },
  {
    label: "销售管理",
    items: [
      { id: "sales-orders", icon: ShoppingCart, label: "销售订单" },
      { id: "sales-shipments", icon: PackageCheck, label: "销售出库" },
      { id: "customer", icon: ContactRound, label: "客户管理" },
    ],
  },
  {
    label: "采购管理",
    items: [
      { id: "purchase-orders", icon: ClipboardList, label: "采购订单" },
      { id: "purchase-receipts", icon: Truck, label: "采购入库" },
      { id: "purchase-suppliers", icon: Contact, label: "供应商管理" },
    ],
  },
  {
    label: "库存管理",
    items: [
      { id: "inventory-stocks", icon: Boxes, label: "库存查询" },
      { id: "inventory-counts", icon: ClipboardCheck, label: "库存盘点" },
      { id: "inventory-transfers", icon: ArrowLeftRight, label: "库存调拨" },
      { id: "inventory-warehouses", icon: Warehouse, label: "仓库管理" },
    ],
  },
  {
    label: "独立站",
    items: [
      { id: "storefront-leads", icon: MessageSquareText, label: "线索池" },
      { id: "storefront-products", icon: Package, label: "商品池" },
      { id: "storefront-design", icon: LayoutTemplate, label: "站点设计" },
      { id: "storefront-translations", icon: Languages, label: "多语言内容" },
      { id: "storefront-settings", icon: SlidersHorizontal, label: "站点设置" },
      { id: "storefront-releases", icon: History, label: "发版历史" },
    ],
  },
  {
    label: "财务管理",
    items: [
      { id: "finance-receipts", icon: CircleDollarSign, label: "收款管理" },
      { id: "finance-payments", icon: HandCoins, label: "付款管理" },
      { id: "finance-statistics", icon: ChartNoAxesCombined, label: "财务统计" },
    ],
  },
  {
    label: "系统管理",
    items: [
      { id: "system-settings", icon: Settings, label: "系统设置" },
      { id: "team-management", icon: Users, label: "成员与权限" },
    ],
  },
] as const;

const DASHBOARD_ITEM = {
  id: "dashboard",
  icon: LayoutDashboard,
  label: "经营概览",
} as const;

const MENU_PERMISSIONS: Record<string, string> = {
  dashboard: "menu.dashboard",
  products: "menu.products",
  "product-categories": "menu.product-categories",
  "inventory-stocks": "menu.inventory.stocks",
  "inventory-counts": "menu.inventory.counts",
  "inventory-transfers": "menu.inventory.transfers",
  "inventory-warehouses": "menu.inventory.warehouses",
  "sales-orders": "menu.sales.orders",
  "sales-shipments": "menu.sales.shipments",
  customer: "menu.customers",
  "purchase-orders": "menu.purchase.orders",
  "purchase-receipts": "menu.purchase.receipts",
  "purchase-suppliers": "menu.purchase.suppliers",
  "finance-receipts": "menu.finance.receipts",
  "finance-payments": "menu.finance.payments",
  "finance-statistics": "menu.finance.statistics",
  "system-settings": "menu.settings",
  "team-management": "menu.team",
  "storefront-leads": "menu.storefront.leads",
  "storefront-products": "menu.storefront.products",
  "storefront-releases": "menu.storefront.releases",
  "storefront-design": "menu.site",
  "storefront-settings": "menu.storefront.settings",
  "storefront-translations": "menu.storefront.translations",
};
const PAGE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ["page.dashboard"],
  products: ["page.products"],
  "product-categories": ["page.product-categories"],
  "inventory-stocks": ["page.inventory.stocks"],
  "inventory-counts": ["page.inventory.counts"],
  "inventory-transfers": ["page.inventory.transfers"],
  "inventory-warehouses": ["page.inventory.warehouses"],
  "sales-orders": ["page.sales.orders"],
  "sales-shipments": ["page.sales.shipments"],
  customer: ["page.customers"],
  "purchase-orders": ["page.purchase.orders"],
  "purchase-receipts": ["page.purchase.receipts"],
  "purchase-suppliers": ["page.purchase.suppliers"],
  "finance-receipts": ["page.finance.receipts"],
  "finance-payments": ["page.finance.payments"],
  "finance-statistics": ["page.finance.statistics"],
  "system-settings": ["page.settings.account"],
  "team-management": ["page.settings.team"],
  "storefront-leads": ["page.storefront.leads"],
  "storefront-products": ["page.storefront.products"],
  "storefront-releases": ["page.storefront.releases"],
  "storefront-design": ["page.site.editor"],
  "storefront-settings": ["page.site.settings"],
  "storefront-translations": ["page.site.translations"],
};
const GROUP_PERMISSIONS: Record<string, string[]> = {
  商品管理: ["group.products"],
  采购管理: ["group.purchase"],
  财务管理: ["group.finance"],
  库存管理: ["group.inventory"],
  销售管理: ["group.sales"],
  独立站: ["group.site"],
  系统管理: ["group.system"],
};
const canOpenGroup = (label: string) => GROUP_PERMISSIONS[label].some(can);
const canOpenMenuItem = (id: string) =>
  can(MENU_PERMISSIONS[id]) && PAGE_PERMISSIONS[id].some(can);

// ─────────────── AdminSidebar ───────────────

const AdminSidebar: React.FC = () => {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = getPageId(location.pathname, location.search);
  const [, setPermissionVersion] = useState(0);
  useEffect(() => {
    const refreshIdentity = () => setPermissionVersion(version => version + 1);
    window.addEventListener("mercivo-user-updated", refreshIdentity);
    return () => window.removeEventListener("mercivo-user-updated", refreshIdentity);
  }, []);
  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        const tenant = JSON.parse(
          localStorage.getItem("mercivo_tenant") || "{}",
        );
        localStorage.setItem(
          "mercivo_tenant",
          JSON.stringify({ ...tenant, permissions: session.permissions || [] }),
        );
        setPermissionVersion((version) => version + 1);
      })
      .catch(() => undefined);
  }, []);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >(() => {
    const defaults = Object.fromEntries(
      MENU_GROUPS.map((group) => [group.label, group.label === "系统管理"]),
    );
    try {
      return {
        ...defaults,
        ...JSON.parse(localStorage.getItem("mercivo_menu_collapsed") || "{}"),
      };
    } catch {
      return defaults;
    }
  });
  const toggleGroup = (label: string) =>
    setCollapsedGroups((current) => {
      const next = { ...current, [label]: !current[label] };
      localStorage.setItem("mercivo_menu_collapsed", JSON.stringify(next));
      return next;
    });

  const handleNav = (pageId: string) => {
    const route = PAGE_ROUTES[pageId];
    if (route) navigate(route);
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "settings",
      label: "账号信息",
      icon: <Settings className="w-3.5 h-3.5" />,
    },
    {
      key: "change-password",
      label: "修改密码",
      icon: <KeyRound className="w-3.5 h-3.5" />,
    },
    {
      key: "billing",
      label: "套餐账单",
      icon: <CreditCard className="w-3.5 h-3.5" />,
    },
    { type: "divider" },
    { key: "logout", label: <span className="text-red-500">退出登录</span> },
  ];
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("mercivo_user") || "{}") as {
        account?: string;
        name?: string;
        role?: string;
      };
    } catch {
      return {};
    }
  })();
  const storedTenant = (() => {
    try {
      return JSON.parse(localStorage.getItem("mercivo_tenant") || "{}") as {
        name?: string;
      };
    } catch {
      return {};
    }
  })();
  const displayName = storedUser.role === "admin"
    ? storedTenant.name || "商户管理员"
    : storedUser.name || storedUser.account || "成员账号";

  return (
    <aside
      className="w-60 flex flex-col h-full flex-shrink-0 border-r border-border"
      style={{ background: "var(--sidebar)" }}
    >
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-auto space-y-5">
        {canOpenMenuItem(DASHBOARD_ITEM.id) && (
          <button
            onClick={() => handleNav(DASHBOARD_ITEM.id)}
            aria-label={DASHBOARD_ITEM.label}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-normal transition-all ${activePage === DASHBOARD_ITEM.id ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary hover:text-foreground"}`}
          >
            <DASHBOARD_ITEM.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{DASHBOARD_ITEM.label}</span>
          </button>
        )}
        {MENU_GROUPS.filter(
          (group) =>
            canOpenGroup(group.label) &&
            group.items.some((item) => canOpenMenuItem(item.id)),
        ).map((group) => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between px-3 pb-2 text-xs font-normal uppercase tracking-widest text-foreground/60 transition-colors hover:text-foreground/80"
            >
              <span>{group.label}</span>
              {collapsedGroups[group.label] ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {!collapsedGroups[group.label] && (
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => canOpenMenuItem(item.id))
                  .map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        aria-label={item.label}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-normal transition-all ${
                          isActive
                            ? "bg-primary/10 text-primary shadow-none"
                            : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`}
                        />
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom: User */}
      <div className="p-3 border-t border-border">
        <Dropdown
          menu={{
            items: userMenuItems,
            onClick: ({ key }) => {
              if (key === "logout") {
                localStorage.removeItem("mercivo_access_token");
                localStorage.removeItem("mercivo_user");
                localStorage.removeItem("mercivo_tenant");
                window.location.assign("/login");
              } else if (key === "change-password") {
                setPasswordModalOpen(true);
              } else if (key === "billing" && storedUser.role !== "admin") {
                message.info("请联系商户管理员或检查当前套餐权限。");
              } else handleNav(key);
            },
          }}
          placement="topLeft"
          trigger={["click"]}
        >
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-secondary">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-primary/20">
              {displayName.slice(-2) || "用户"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-semibold text-foreground">
                {displayName}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {storedUser.account || "管理员账号"}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </Dropdown>
      </div>
      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
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
