export type PermissionLevel = "primary" | "secondary" | "page" | "button";
export type PermissionType = "menu" | "page" | "button";

export interface PermissionCatalogItem {
  group: string;
  key: string;
  label: string;
  type: PermissionType;
  level: PermissionLevel;
  parentKey: string | null;
}

const primary = (key: string, label: string): PermissionCatalogItem => ({
  group: label,
  key,
  label,
  type: "menu",
  level: "primary",
  parentKey: null,
});
const secondary = (
  group: string,
  key: string,
  label: string,
  parentKey: string,
): PermissionCatalogItem => ({
  group,
  key,
  label,
  type: "menu",
  level: "secondary",
  parentKey,
});
const page = (
  group: string,
  key: string,
  label: string,
  parentKey: string,
): PermissionCatalogItem => ({
  group,
  key,
  label,
  type: "page",
  level: "page",
  parentKey,
});
const button = (
  group: string,
  key: string,
  label: string,
  parentKey: string,
): PermissionCatalogItem => ({
  group,
  key,
  label,
  type: "button",
  level: "button",
  parentKey,
});

export const PERMISSION_CATALOG: PermissionCatalogItem[] = [
  primary("menu.dashboard", "经营概览"),
  page("经营概览", "page.dashboard", "经营概览页面", "menu.dashboard"),
  primary("group.products", "商品管理"),
  secondary("商品管理", "menu.products", "商品列表", "group.products"),
  page("商品管理", "page.products", "商品管理页面", "menu.products"),
  button("商品管理", "product.create", "新建商品", "menu.products"),
  button("商品管理", "product.edit", "编辑商品", "menu.products"),
  button("商品管理", "product.delete", "删除商品", "menu.products"),
  button("商品管理", "product.publish", "发布商品", "menu.products"),
  secondary(
    "商品管理",
    "menu.product-categories",
    "商品分类",
    "group.products",
  ),
  page(
    "商品分类",
    "page.product-categories",
    "商品分类页面",
    "menu.product-categories",
  ),
  button(
    "商品分类",
    "product-category.manage",
    "管理商品分类",
    "menu.product-categories",
  ),
  primary("group.sales", "销售管理"),
  secondary("销售管理", "menu.customers", "客户管理", "group.sales"),
  page("客户管理", "page.customers", "客户管理页面", "menu.customers"),
  button("客户管理", "customer.create", "新建客户", "menu.customers"),
  button("客户管理", "customer.edit", "编辑客户", "menu.customers"),
  button("客户管理", "customer.delete", "删除客户", "menu.customers"),
  button("客户管理", "customer.level.manage", "管理客户等级", "menu.customers"),
  secondary("销售管理", "menu.sales.orders", "销售订单", "group.sales"),
  page("销售订单", "page.sales.orders", "销售订单页面", "menu.sales.orders"),
  button(
    "销售订单",
    "sales.order.create",
    "新建和编辑订单",
    "menu.sales.orders",
  ),
  button("销售订单", "sales.order.confirm", "确认订单", "menu.sales.orders"),
  button(
    "销售订单",
    "sales.order.cancel",
    "取消和删除订单",
    "menu.sales.orders",
  ),
  secondary("销售管理", "menu.sales.shipments", "销售出库", "group.sales"),
  page(
    "销售出库",
    "page.sales.shipments",
    "销售出库页面",
    "menu.sales.shipments",
  ),
  button(
    "销售出库",
    "sales.shipment.create",
    "创建销售出库单",
    "menu.sales.shipments",
  ),

  primary("group.purchase", "采购管理"),
  secondary("采购管理", "menu.purchase.orders", "采购订单", "group.purchase"),
  page(
    "采购订单",
    "page.purchase.orders",
    "采购订单页面",
    "menu.purchase.orders",
  ),
  button(
    "采购订单",
    "purchase.order.create",
    "新建和编辑采购订单",
    "menu.purchase.orders",
  ),
  button(
    "采购订单",
    "purchase.order.confirm",
    "确认采购订单",
    "menu.purchase.orders",
  ),
  button(
    "采购订单",
    "purchase.order.cancel",
    "取消和删除采购订单",
    "menu.purchase.orders",
  ),
  secondary("采购管理", "menu.purchase.receipts", "采购入库", "group.purchase"),
  page(
    "采购入库",
    "page.purchase.receipts",
    "采购入库页面",
    "menu.purchase.receipts",
  ),
  button(
    "采购入库",
    "purchase.receipt.create",
    "创建采购入库单",
    "menu.purchase.receipts",
  ),
  secondary(
    "采购管理",
    "menu.purchase.suppliers",
    "供应商管理",
    "group.purchase",
  ),
  page(
    "供应商管理",
    "page.purchase.suppliers",
    "供应商管理页面",
    "menu.purchase.suppliers",
  ),
  button(
    "供应商管理",
    "purchase.supplier.create",
    "新建供应商",
    "menu.purchase.suppliers",
  ),
  button(
    "供应商管理",
    "purchase.supplier.edit",
    "编辑供应商",
    "menu.purchase.suppliers",
  ),
  button(
    "供应商管理",
    "purchase.supplier.delete",
    "删除供应商",
    "menu.purchase.suppliers",
  ),

  primary("group.inventory", "库存管理"),
  secondary("库存管理", "menu.inventory.stocks", "库存查询", "group.inventory"),
  page(
    "库存查询",
    "page.inventory.stocks",
    "库存查询页面",
    "menu.inventory.stocks",
  ),
  button(
    "库存查询",
    "inventory.ledger.view",
    "查看库存流水",
    "menu.inventory.stocks",
  ),
  secondary("库存管理", "menu.inventory.counts", "库存盘点", "group.inventory"),
  page(
    "库存盘点",
    "page.inventory.counts",
    "库存盘点页面",
    "menu.inventory.counts",
  ),
  button(
    "库存盘点",
    "inventory.count.create",
    "创建和录入盘点",
    "menu.inventory.counts",
  ),
  button(
    "库存盘点",
    "inventory.count.complete",
    "执行盘点",
    "menu.inventory.counts",
  ),
  secondary(
    "库存管理",
    "menu.inventory.transfers",
    "库存调拨",
    "group.inventory",
  ),
  page(
    "库存调拨",
    "page.inventory.transfers",
    "库存调拨页面",
    "menu.inventory.transfers",
  ),
  button(
    "库存调拨",
    "inventory.transfer.create",
    "创建并发出调拨",
    "menu.inventory.transfers",
  ),
  button(
    "库存调拨",
    "inventory.transfer.receive",
    "调拨收货",
    "menu.inventory.transfers",
  ),
  secondary(
    "库存管理",
    "menu.inventory.warehouses",
    "仓库管理",
    "group.inventory",
  ),
  page(
    "仓库管理",
    "page.inventory.warehouses",
    "仓库管理页面",
    "menu.inventory.warehouses",
  ),
  button(
    "仓库管理",
    "inventory.warehouse.manage",
    "管理仓库",
    "menu.inventory.warehouses",
  ),

  primary("group.site", "独立站"),
  secondary("独立站", "menu.storefront.leads", "线索池", "group.site"),
  page("线索池", "page.storefront.leads", "线索池页面", "menu.storefront.leads"),
  button("线索池", "storefront.lead.assign", "跟进和指派", "menu.storefront.leads"),
  button("线索池", "storefront.lead.manage", "跟进和处理线索", "menu.storefront.leads"),
  secondary("独立站", "menu.storefront.products", "商品池", "group.site"),
  page("商品池", "page.storefront.products", "商品池页面", "menu.storefront.products"),
  secondary("独立站", "menu.site", "站点设计", "group.site"),
  page("站点设计", "page.site.editor", "站点设计页面", "menu.site"),
  button("站点设计", "site.edit", "保存站点内容", "menu.site"),
  button("站点设计", "site.publish", "发布站点", "menu.site"),
  secondary("独立站", "menu.storefront.translations", "多语言内容", "group.site"),
  page("多语言内容", "page.site.translations", "多语言内容页面", "menu.storefront.translations"),
  button("多语言内容", "site.translation.edit", "编辑多语言内容", "menu.storefront.translations"),
  secondary("独立站", "menu.storefront.releases", "发版历史", "group.site"),
  page("发版历史", "page.storefront.releases", "发版历史页面", "menu.storefront.releases"),
  secondary("独立站", "menu.storefront.settings", "站点设置", "group.site"),
  page("站点设置", "page.site.settings", "查看站点设置", "menu.storefront.settings"),
  button("站点设置", "settings.site", "编辑站点设置", "menu.storefront.settings"),
  button("站点设置", "site.domain", "管理自定义域名", "menu.storefront.settings"),

  primary("group.finance", "财务管理"),
  secondary("财务管理", "menu.finance.receipts", "收款管理", "group.finance"),
  page("收款管理", "page.finance.receipts", "收款管理页面", "menu.finance.receipts"),
  button("收款管理", "finance.receipt.create", "登记收款", "menu.finance.receipts"),
  button("收款管理", "finance.receipt.confirm", "确认收款", "menu.finance.receipts"),
  button("收款管理", "finance.receipt.cancel", "取消收款", "menu.finance.receipts"),
  secondary("财务管理", "menu.finance.payments", "付款管理", "group.finance"),
  page("付款管理", "page.finance.payments", "付款管理页面", "menu.finance.payments"),
  button("付款管理", "finance.payment.create", "登记付款", "menu.finance.payments"),
  button("付款管理", "finance.payment.confirm", "确认付款", "menu.finance.payments"),
  button("付款管理", "finance.payment.cancel", "取消付款", "menu.finance.payments"),
  secondary("财务管理", "menu.finance.statistics", "财务统计", "group.finance"),
  page("财务统计", "page.finance.statistics", "财务统计页面", "menu.finance.statistics"),

  primary("group.system", "系统管理"),
  secondary("系统管理", "menu.settings", "系统设置", "group.system"),
  page("系统设置", "page.settings.account", "系统设置页面", "menu.settings"),
  button("系统设置", "settings.account", "编辑系统设置", "menu.settings"),
  secondary("系统管理", "menu.team", "成员与权限", "group.system"),
  page("成员与权限", "page.settings.team", "成员与权限页面", "menu.team"),
  button("成员与权限", "settings.team", "管理成员权限", "menu.team"),
];

export const ALL_PERMISSIONS = PERMISSION_CATALOG.map((item) => item.key);

/**
 * Finance is an accounting continuation of the sales and purchase workflow.
 * Existing ERP plans created before the finance module shipped need these keys
 * added to their persisted permission snapshot.
 */
export const FINANCE_PERMISSIONS = ALL_PERMISSIONS.filter(
  (key) => key === "group.finance" || key.startsWith("menu.finance.") || key.startsWith("page.finance.") || key.startsWith("finance."),
);

export function migrateFinanceWorkflowPermissions(permissions: string[]) {
  const selected = new Set(permissions);
  if (selected.delete("page.site.seo")) selected.add("page.site.settings");
  const legacySiteEdit = ["settings.site.info", "settings.site.languages", "settings.seo"];
  if (legacySiteEdit.some((permission) => selected.delete(permission))) selected.add("settings.site");
  if (selected.delete("finance.receipt.void")) {
    selected.add("finance.receipt.confirm");
    selected.add("finance.receipt.cancel");
  }
  if (selected.delete("finance.payment.void")) {
    selected.add("finance.payment.confirm");
    selected.add("finance.payment.cancel");
  }
  return [...selected];
}

export function withFinancePermissionsForErpPlan(permissions: string[]) {
  const selected = new Set(migrateFinanceWorkflowPermissions(permissions));
  if (selected.has("group.site")) {
    [
      "menu.storefront.leads", "page.storefront.leads",
      "menu.storefront.products", "page.storefront.products",
      "menu.storefront.translations", "page.site.translations", "site.translation.edit",
      "menu.storefront.releases", "page.storefront.releases",
    ].forEach((permission) => selected.add(permission));
    if (["page.site.settings", "settings.site", "site.domain"].some((permission) => selected.has(permission))) {
      selected.add("menu.storefront.settings");
    }
  }
  if (!selected.has("group.sales") || !selected.has("group.purchase"))
    return ALL_PERMISSIONS.filter((permission) => selected.has(permission));
  FINANCE_PERMISSIONS.forEach((permission) => selected.add(permission));
  return ALL_PERMISSIONS.filter((permission) => selected.has(permission));
}

export function withPermissionParents(permissions: string[]) {
  const selected = new Set(permissions);
  for (const key of [...selected]) {
    let current = PERMISSION_CATALOG.find((item) => item.key === key);
    while (current?.parentKey) {
      selected.add(current.parentKey);
      current = PERMISSION_CATALOG.find(
        (item) => item.key === current?.parentKey,
      );
    }
  }
  const known = new Set(ALL_PERMISSIONS);
  return ALL_PERMISSIONS.filter((key) => selected.has(key) && known.has(key));
}

const TRIAL_UNAVAILABLE_PERMISSIONS = new Set([
  "site.publish",
  "site.domain",
]);
export const TRIAL_PERMISSIONS = ALL_PERMISSIONS.filter(
  (key) => !TRIAL_UNAVAILABLE_PERMISSIONS.has(key),
);
