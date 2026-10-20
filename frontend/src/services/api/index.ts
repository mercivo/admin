import api from "../api";
import type { Product, ProductCategory } from "../../types";

// ---- 扩展类型定义 ----
export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  totalCustomers: number;
  pendingProducts: number;
  siteStatus: string;
  topProducts: { name: string; sku: string; stock: number; status: string }[];
  customerValue: number;
  orders: { salesTotal: number; salesOpen: number; purchaseTotal: number; purchaseOpen: number };
  risks: { pendingFunds: number; lowStock: number; pendingProducts: number };
  defaultCurrency: string;
  currencies: Array<{ code: string; symbol: string; name: string }>;
  financials: Array<{
    currency: string;
    salesAmount: number;
    purchaseAmount: number;
    currentMonthSales: number;
    currentMonthPurchases: number;
    receipts: number;
    payments: number;
    monthly: Array<{ month: number; label: string; sales: number; purchases: number }>;
  }>;
  monthlyOrders: Array<{ month: string; label: string; sales: number; purchases: number }>;
  topSellingProducts: Array<{ currency: string; productId: string; name: string; sku: string; quantity: number; amount: number }>;
  latestSalesOrders: Array<{ id: string; orderNo: string; customerName: string | null; currency: string; amount: number; status: string; createdAt: string }>;
  lowStockProducts: Array<{ id: string; productId: string; name: string; sku: string; variantKey: string; variantLabel: string; warehouseName: string; available: number; warningStock: number }>;
  categoryDistribution: Array<{ category: string; categoryName: string; count: number }>;
  salesCategoryDistribution: Array<{ currency: string; category: string; categoryName: string; amount: number }>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'member';
  permissions?: string[];
  avatar: string;
  color: string;
  joinedAt: string;
}
export interface WorkspaceSettings {
  account: {
    enterpriseName: string;
    memberName?: string;
    phone: string;
    email: string;
    timezone: "Asia/Shanghai";
    role: string;
    joinedAt: string;
  };
  site: {
    id: string;
    slug: string;
    name: string;
    description: string;
    logoUrl: string;
    defaultLanguage: string;
    supportedLanguages?: string[];
    defaultCurrency: string;
    domain: string;
    domainStatus: string;
    status: string;
  };
  billing: {
    plan: string;
    status: string;
    expiresAt: string | null;
    limits: {
      products: number;
      members: number;
      warehouses: number;
    };
    usage: {
      products: number;
      members: number;
      warehouses: number;
    };
    sitePublishing: boolean;
    features: Record<string, boolean>;
    permissions: string[];
  };
}
export interface PlanItem {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: "month" | "year";
  description?: string;
  maxProducts: number;
  maxMembers: number;
  maxWarehouses: number;
  features: Record<string, boolean>;
  permissions: string[];
  enabled: boolean;
  sortOrder: number;
}
export interface SubscriptionOrder {
  id: string;
  orderNo: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  effectiveAt: string;
  expiresAt: string | null;
  createdAt: string;
}
export interface PermissionItem {
  group: string;
  key: string;
  label: string;
  type: "menu" | "page" | "button";
  level: "primary" | "secondary" | "page" | "button";
  parentKey: string | null;
}
export interface StorefrontLead {
  id: string;
  type: 'inquiry' | 'sample' | 'contact';
  status: 'new' | 'following' | 'converted' | 'closed';
  name: string;
  contact: string;
  email: string;
  company: string;
  phone: string;
  country: string;
  productId: string | null;
  productName: string;
  sourcePage: string;
  requirements: string;
  note: string | null;
  assignedToUserId: string | null;
  assignedToName: string;
  closeReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface StorefrontOverview {
  products: { total: number; published: number; pending: number };
  leads: { total: number; new: number; following: number; converted: number };
  recentLeads: StorefrontLead[];
}
export interface ManagedSite {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  defaultLanguage: string;
  defaultCurrency: string;
  supportedLanguages?: string[];
  publishedVersionId?: string;
}
export interface SiteDomain {
  id: string;
  siteId: string;
  hostname: string;
  isPrimary: boolean;
  status: "active" | "disabled";
  sslStatus: "pending" | "active" | "failed";
  verificationRecord?: { type: string; name: string; value: string } | null;
  routingRecord?: { type: string; name: string; value: string };
  verifiedAt?: string | null;
}
export interface SiteVersion {
  id: string;
  siteId: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  releaseNote: string;
}
export interface Customer {
  id: string;
  name: string;
  company: string;
  phone: string | null;
  email: string;
  country: string;
  level: string;
  status: "active" | "disabled";
  orders: number;
  totalAmount: number;
  lastOrderAt: string | null;
  notes?: string;
}
export type CustomerInput = Pick<
  Customer,
  "name" | "email" | "phone" | "country" | "level" | "status" | "notes"
>;
export interface CustomerLevel {
  id: string;
  code: string;
  name: string;
  note: string;
  discountRate: number | null;
}
export interface GuestPricingPolicy {
  mode: "base" | "hidden" | "percentage";
}
export interface Warehouse {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  status: "active" | "disabled";
  isDefault: boolean;
  isLocked: boolean;
  activeCountId: string | null;
  activeCountDocumentNo: string | null;
  createdAt: string;
}
export interface InventoryStock {
  id: string;
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  productSku: string;
  variantKey: string;
  variantLabel: string;
  onHand: number;
  reserved: number;
  available: number;
  inTransit: number;
  warningStock: number;
  status: "normal" | "warning" | "out";
  updatedAt: string;
}
export interface InventoryLedgerEntry {
  id: string;
  warehouseId: string;
  warehouseName: string;
  productId: string;
  productName: string;
  productSku: string;
  variantKey: string;
  variantLabel: string;
  type:
    | "opening"
    | "count_adjust"
    | "transfer_out"
    | "transfer_in"
    | "purchase_in"
    | "sales_out";
  quantityChange: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string;
  referenceNo: string;
  actorUserId: string;
  remark: string;
  createdAt: string;
}
export type WarehouseInput = Pick<
  Warehouse,
  "name" | "contact" | "phone" | "address" | "status"
>;
export interface StockCountLine {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  variantKey: string;
  variantLabel: string;
  systemQuantity: number;
  countedQuantity: number | null;
  difference: number;
}
export interface StockCount {
  id: string;
  documentNo: string;
  warehouseId: string;
  warehouseName: string;
  status: "draft" | "counting" | "completed" | "cancelled";
  remark: string;
  lines: StockCountLine[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
export interface StockTransferLine {
  id: string;
  productId: string;
  variantKey: string;
  quantity: number;
}
export interface StockTransfer {
  id: string;
  documentNo: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  status: "shipped" | "received" | "cancelled";
  remark: string;
  lines: StockTransferLine[];
  createdAt: string;
  shippedAt?: string;
  receivedAt?: string;
}
export type SalesOrderStatus =
  "confirmed" | "partially_shipped" | "completed" | "cancelled";
export interface SalesOrderLine {
  id: string;
  productId: string;
  variantKey: string;
  productName: string;
  productSku: string;
  variantLabel: string;
  quantity: number;
  shippedQuantity: number;
  unitPrice: number;
  amount: number;
}
export interface SalesOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  warehouseId: string;
  warehouseName: string;
  currency: string;
  amount: number;
  discount: number;
  shippingFee: number;
  totalAmount: number;
  status: SalesOrderStatus;
  deliveryDate: string | null;
  shippingAddress: string;
  contactName: string;
  contactPhone: string;
  remark: string;
  lines: SalesOrderLine[];
  createdAt: string;
  confirmedAt?: string | null;
}
export interface SalesOrderInput {
  customerId: string;
  warehouseId: string;
  currency?: string;
  discount?: number;
  shippingFee?: number;
  deliveryDate?: string;
  shippingAddress?: string;
  contactName?: string;
  contactPhone?: string;
  remark?: string;
  lines: Array<{
    productId: string;
    variantKey: string;
    quantity: number;
    unitPrice: number;
  }>;
}
export interface SalesShipmentLine {
  id: string;
  orderLineId: string;
  productId: string;
  variantKey: string;
  productName: string;
  variantLabel: string;
  quantity: number;
}
export interface SalesShipment {
  id: string;
  shipmentNo: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  status: "shipped" | "cancelled";
  deliveryMethod: "offline" | "logistics";
  logisticsCompany: string;
  trackingNo: string;
  remark: string;
  lines: SalesShipmentLine[];
  shippedAt: string;
  createdAt: string;
}
export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  taxNo: string;
  paymentTerms: string;
  paymentDays: number;
  status: "active" | "disabled";
  remark: string;
  createdAt: string;
}
export type SupplierInput = Pick<
  Supplier,
  "name" | "contact" | "phone" | "email" | "address" | "status" | "remark"
>;
export interface PurchaseOrderLine {
  id: string;
  productId: string;
  variantKey: string;
  productName: string;
  productSku: string;
  variantLabel: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  amount: number;
}
export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  currency: string;
  amount: number;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  status:
    "draft" | "confirmed" | "partially_received" | "completed" | "cancelled";
  expectedDate: string | null;
  remark: string;
  lines: PurchaseOrderLine[];
  createdAt: string;
  confirmedAt?: string | null;
}
export interface PurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  currency?: string;
  taxAmount?: number;
  shippingFee?: number;
  expectedDate?: string;
  remark?: string;
  lines: Array<{
    productId: string;
    variantKey: string;
    quantity: number;
    unitPrice: number;
  }>;
}
export interface PurchaseReceiptLine {
  id: string;
  orderLineId: string;
  productId: string;
  variantKey: string;
  productName: string;
  variantLabel: string;
  quantity: number;
}
export interface PurchaseReceipt {
  id: string;
  receiptNo: string;
  orderId: string;
  orderNo: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: "received";
  remark: string;
  lines: PurchaseReceiptLine[];
  receivedAt: string;
  createdAt: string;
}
export type FinanceTransactionType = "receipt" | "payment";
export type FinancePaymentMethod = "bank_transfer" | "cash" | "wechat" | "alipay" | "other";
export interface FinanceTransaction {
  id: string;
  transactionNo: string;
  type: FinanceTransactionType;
  orderId: string;
  orderNo: string;
  partnerId: string;
  partnerName: string;
  currency: string;
  amount: number;
  paymentMethod: FinancePaymentMethod;
  accountName: string;
  referenceNo: string;
  transactionDate: string;
  status: "pending" | "confirmed" | "cancelled";
  remark: string;
  cancelReason: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  orderDetail?: FinanceOrderDetail | null;
}
export interface FinanceOrderDetail {
  id: string;
  orderNo: string;
  partnerName: string;
  currency: string;
  status: string;
  orderDate: string;
  fulfillmentDate?: string | null;
  warehouseName: string;
  discountAmount: number;
  taxAmount: number;
  orderAmount: number;
  totalAmount: number;
  items: Array<{
    id: string;
    productName: string;
    productSku: string;
    variantLabel: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}
export interface FinanceOrderOption extends FinanceOrderDetail {
  settledAmount: number;
  pendingAmount: number;
  remainingAmount: number;
}
export interface FinanceTransactionInput {
  orderId: string;
  amount: number;
  paymentMethod: FinancePaymentMethod;
  accountName?: string;
  referenceNo?: string;
  transactionDate: string;
  remark?: string;
}
export interface FinanceStatistics {
  year: number;
  currency: string;
  summary: { salesAmount: number; purchaseAmount: number; receiptAmount: number; paymentAmount: number };
  monthly: Array<{ month: number; monthLabel: string; salesAmount: number; purchaseAmount: number; receiptAmount: number; paymentAmount: number }>;
}
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Dashboard API ----
export const dashboardApi = {
  getStats: () => api.get<any, DashboardStats>("/dashboard/stats"),
};

export const storefrontManageApi = {
  overview: () => api.get<any, StorefrontOverview>('/storefront/overview'),
  leads: (params?: Record<string, string | number | undefined>) => api.get<any, Paged<StorefrontLead>>('/storefront/leads', { params }),
  createLead: (data: Pick<StorefrontLead, 'name' | 'contact' | 'requirements'>) => api.post<any, StorefrontLead>('/storefront/leads', data),
  leadAssignees: () => api.get<any, { currentUserId: string; members: Array<{ userId: string; name: string; role: string }> }>('/storefront/lead-assignees'),
  updateLead: (id: string, data: Pick<StorefrontLead, 'status'> & { note?: string; assigneeUserId?: string; closeReason?: string }) => api.patch<any, StorefrontLead>(`/storefront/leads/${id}`, data),
  products: (params?: Record<string, string | number | undefined>) => api.get<any, Paged<Product> & { categoryCounts: Record<string, number>; categories: ProductCategory[]; summary: { totalProducts: number } }>('/storefront/product-pool', { params }),
};

// ---- Product API ----
export const productApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<Product> & {
        summary: {
          categoryCounts: Record<string, number>;
          totalProducts: number;
        };
      }
    >("/product", { params }),
  catalog: () => api.get<any, Product[]>("/product/catalog/all"),
  options: () => api.get<any, Product[]>("/product/options/all"),
  getById: (id: string) => api.get<any, Product>(`/product/${id}`),
  create: (data: Partial<Product>) => api.post<any, Product>("/product", data),
  update: (id: string, data: Partial<Product>) =>
    api.put<any, Product>(`/product/${id}`, data),
  remove: (id: string) => api.delete(`/product/${id}`),
  getSeo: (id: string) => api.get<any, Product>(`/product/${id}/seo`),
  updateSeo: (id: string, data: Record<string, unknown>) =>
    api.put<any, Product>(`/product/${id}/seo`, data),
  uploadImage: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return api.post<any, { url: string; objectName: string }>(
      "/product/images",
      data,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
  uploadSiteLogo: (file: File) => {
    const data = new FormData();
    data.append("file", file);
    return api.post<any, { url: string; objectName: string }>(
      "/product/site-logo",
      data,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
};

// ---- Product Category API ----
export const productCategoryApi = {
  list: () => api.get<any, ProductCategory[]>("/product-categories"),
  create: (data: Record<string, unknown>) =>
    api.post<any, ProductCategory>("/product-categories", data),
  update: (code: string, data: Record<string, unknown>) =>
    api.put(`/product-categories/${code}`, data),
  remove: (code: string) => api.delete(`/product-categories/${code}`),
};

export const workspaceApi = {
  getSettings: () => api.get<any, WorkspaceSettings>("/workspace/settings"),
  updateAccount: (data: WorkspaceSettings["account"]) =>
    api.put<any, WorkspaceSettings>("/workspace/settings/account", {
      enterpriseName: data.enterpriseName,
      memberName: data.memberName,
      phone: data.phone,
      email: data.email,
      timezone: "Asia/Shanghai",
    }),
  updateSiteInfo: (data: Pick<WorkspaceSettings["site"], "name" | "description" | "logoUrl">) =>
    api.put("/workspace/settings/site-info", {
      name: data.name,
      description: data.description,
      logoUrl: data.logoUrl,
    }),
  updateSiteLanguages: (data: Pick<WorkspaceSettings["site"], "defaultLanguage" | "supportedLanguages">) =>
    api.put("/workspace/settings/site-languages", {
      defaultLanguage: data.defaultLanguage,
      supportedLanguages: data.supportedLanguages,
    }),
  getSiteContact: <T>() => api.get<any, T>("/workspace/settings/site-contact"),
  updateSiteContact: <T extends object>(value: T) => api.put<any, T>("/workspace/settings/site-contact", { value }),
  getConfig: <T>(key: string) => api.get<any, T>(`/workspace/config/${key}`),
  updateConfig: <T extends object>(key: string, value: T) =>
    api.put<any, T>(`/workspace/config/${key}`, { value }),
  listTeam: () => api.get<any, TeamMember[]>("/workspace/team"),
  teamPermissions: () =>
    api.get<any, PermissionItem[]>("/workspace/team/permissions"),
  createMember: (data: {
    name: string;
    email?: string;
    phone: string;
    password: string;
    permissions: string[];
  }) => api.post<any, TeamMember>("/workspace/team", data),
  updateMember: (
    id: string,
    data: { name?: string; email?: string; phone?: string; permissions?: string[] },
  ) => api.put<any, TeamMember>(`/workspace/team/${id}`, data),
  deleteMember: (id: string) => api.delete(`/workspace/team/${id}`),
  listPlans: () => api.get<any, PlanItem[]>("/workspace/plans"),
  listSubscriptionOrders: () =>
    api.get<any, SubscriptionOrder[]>("/workspace/subscription-orders"),
  subscribePlan: (planId: string) =>
    api.post<any, SubscriptionOrder>("/workspace/subscriptions", { planId }),
};

export const siteApi = {
  list: () => api.get<any, ManagedSite[]>("/admin/sites"),
  update: (
    id: string,
    data: Partial<
      Pick<ManagedSite, "name" | "defaultLanguage" | "supportedLanguages">
    >,
  ) => api.put<any, ManagedSite>(`/admin/sites/${id}`, data),
  switchSite: (siteId: string) =>
    api.post<any, { accessToken: string; user: Record<string, unknown> }>(
      "/auth/switch-site",
      { siteId },
    ),
  publish: (id: string, releaseNote: string) =>
    api.post<any, SiteVersion>(`/admin/sites/${id}/publish`, { releaseNote }),
  versions: (id: string, params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<SiteVersion>>(`/admin/sites/${id}/versions`, { params }),
  rollback: (id: string, versionId: string) =>
    api.post<any, SiteVersion>(`/admin/sites/${id}/rollback`, { versionId }),
  domains: (id: string) =>
    api.get<any, SiteDomain[]>(`/admin/sites/${id}/domains`),
  addDomain: (siteId: string, hostname: string, isPrimary = true) =>
    api.post<any, SiteDomain>(`/admin/sites/${siteId}/domains`, {
      hostname,
      isPrimary,
    }),
  verifyDomain: (id: string) =>
    api.post<any, SiteDomain>(`/admin/sites/domains/${id}/verify`),
  removeDomain: (id: string) => api.delete(`/admin/sites/domains/${id}`),
};

export type TranslationStatus = 'missing' | 'completed' | 'stale';
export type TranslationTaskTab = 'product' | 'page' | 'common';
export type TranslationItem = { key: string; resourceType: string; resourceId: string; sourceText: string; sourceHash?: string; contentFormat: 'text' | 'html'; required: boolean; value: string; status: TranslationStatus; updatedAt: string; taskTab?: TranslationTaskTab; groupPath?: string[]; semanticType?: string; reuseGroupId?: string; usage?: string; meta?: { sku?: string; moq?: number; badge?: string; code?: string; parentCode?: string | null; sort?: number; level?: number; path?: string[]; pageId?: string; pageName?: string; componentId?: string; componentType?: string; componentName?: string; fieldLabel?: string; order?: number; taskTab?: TranslationTaskTab; groupPath?: string[]; semanticType?: string; reuseGroupId?: string; usage?: string } };
export type TranslationSummary = { locale: string; total: number; completed: number; stale: number; missing: number; percent: number };
export type TranslationPage = { items: TranslationItem[]; total: number; page: number; pageSize: number; locale: string; summary: TranslationSummary[]; contentSummary?: TranslationSummary[]; groupPage?: number; groupPageSize?: number; groupTotal?: number };
export type TranslationMessages = { sourceLocale: string; locales: string[]; messages: Record<string, Record<string, string>> };
export type TranslationImportRowStatus = 'ready' | 'unchanged' | 'blank' | 'source_changed' | 'removed' | 'duplicate' | 'invalid';
export type TranslationImportPreviewRow = { row: number; unitId: string; key: string; sourceText: string; value: string; status: TranslationImportRowStatus; reason: string };
export type TranslationImportSummary = { total: number; ready: number; unchanged: number; blank: number; sourceChanged: number; removed: number; duplicate: number; invalid: number; addedSinceExport: number };
export type TranslationImportPreview = { token: string; expiresAt: string; summary: TranslationImportSummary; rows: TranslationImportPreviewRow[] };
export type TranslationImportResult = { imported: number; unchanged: number; blankSkipped: number; staleSkipped: number; invalidSkipped: number };
export const translationApi = {
  list: (params: { locale: string; resourceType?: string; taskTab?: TranslationTaskTab; status?: string; keyword?: string; requiredOnly?: boolean; page?: number; pageSize?: number; groupPage?: number; groupPageSize?: number }) => api.get<any, TranslationPage>('/translations', { params }),
  messages: () => api.get<any, TranslationMessages>('/translations/messages'),
  save: (locale: string, items: Array<{ key: string; value: string }>) => api.put<any, TranslationPage>('/translations', { locale, items }),
  export: (locale: string, params?: { taskTab?: TranslationTaskTab; scope?: 'all' | 'incomplete' }) => api.get<any, Blob>(`/translations/export/${locale}`, { params, responseType: 'blob' }),
  previewImport: (locale: string, file: File) => { const body = new FormData(); body.append('file', file); return api.post<any, TranslationImportPreview>(`/translations/import/${locale}/preview`, body, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  commitImport: (locale: string, token: string) => api.post<any, TranslationImportResult>(`/translations/import/${locale}/commit`, { token }),
  importReport: (token: string) => api.get<any, Blob>(`/translations/import/report/${token}`, { responseType: 'blob' }),
};

export const customerApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<Customer> & {
        summary: {
          levelCounts: Record<string, number>;
          totalCustomers: number;
        };
      }
    >("/customers", { params }),
  options: () => api.get<any, Customer[]>("/customers/options/all"),
  create: (data: CustomerInput) => api.post<any, Customer>("/customers", data),
  update: (id: string, data: CustomerInput) =>
    api.put<any, Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  levels: () => api.get<any, CustomerLevel[]>("/customers/levels"),
  createLevel: (data: {
    name: string;
    note?: string;
    discountRate?: number | null;
  }) => api.post<any, CustomerLevel>("/customers/levels", data),
  updateLevel: (
    id: string,
    data: { name: string; note?: string; discountRate?: number | null },
  ) => api.put<any, CustomerLevel>(`/customers/levels/${id}`, data),
  removeLevel: (id: string) => api.delete(`/customers/levels/${id}`),
  pricingPolicy: () =>
    api.get<any, GuestPricingPolicy>("/customers/pricing-policy"),
  updatePricingPolicy: (mode: GuestPricingPolicy["mode"]) =>
    api.put<any, GuestPricingPolicy>("/customers/pricing-policy", { mode }),
};

export const inventoryApi = {
  stocks: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<InventoryStock> & {
        summary: {
          onHand: number;
          available: number;
          inTransit: number;
          warningItems: number;
          warehouses: Array<{
            warehouseId: string;
            warehouseName: string;
            onHand: number;
            available: number;
            inTransit: number;
            warningItems: number;
          }>;
          warningEnabled: boolean;
          warningThreshold: number;
        };
      }
    >("/inventory/stocks", { params }),
  ledger: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<InventoryLedgerEntry> & {
        summary: { inbound: number; outbound: number };
      }
    >("/inventory/ledger", {
      params: params
        ? Object.fromEntries(
            Object.entries(params).filter(
              ([, value]) => value !== "" && value !== undefined,
            ),
          )
        : undefined,
    }),
  warehouses: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<Warehouse>>("/inventory/warehouses", { params }),
  warehouseOptions: () =>
    api.get<any, Warehouse[]>("/inventory/warehouse-options"),
  stockOptions: (warehouseId?: string) =>
    api.get<any, InventoryStock[]>("/inventory/stock-options", {
      params: { warehouseId },
    }),
  createWarehouse: (data: WarehouseInput) =>
    api.post<any, Warehouse>("/inventory/warehouses", data),
  updateWarehouse: (id: string, data: WarehouseInput) =>
    api.put<any, Warehouse>(`/inventory/warehouses/${id}`, data),
  setDefaultWarehouse: (id: string) =>
    api.patch<any, Warehouse>(`/inventory/warehouses/${id}/default`),
  removeWarehouse: (id: string) => api.delete(`/inventory/warehouses/${id}`),
  counts: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<StockCount>>("/inventory/counts", { params }),
  createCount: (data: { warehouseId: string; remark?: string }) =>
    api.post<any, StockCount>("/inventory/counts", data),
  updateCount: (
    id: string,
    data: {
      remark?: string;
      lines: Array<{
        productId: string;
        variantKey: string;
        countedQuantity?: number;
      }>;
    },
  ) => api.put<any, StockCount>(`/inventory/counts/${id}`, data),
  startCount: (id: string) =>
    api.post<any, StockCount>(`/inventory/counts/${id}/start`),
  completeCount: (id: string) =>
    api.post<any, StockCount>(`/inventory/counts/${id}/complete`),
  cancelCount: (id: string) =>
    api.post<any, StockCount>(`/inventory/counts/${id}/cancel`),
  removeCount: (id: string) => api.delete(`/inventory/counts/${id}`),
  transfers: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<StockTransfer>>("/inventory/transfers", { params }),
  createTransfer: (data: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    remark?: string;
    lines: Array<{ productId: string; variantKey: string; quantity: number }>;
  }) => api.post<any, StockTransfer>("/inventory/transfers", data),
  receiveTransfer: (id: string) =>
    api.post<any, StockTransfer>(`/inventory/transfers/${id}/receive`),
  removeTransfer: (id: string) => api.delete(`/inventory/transfers/${id}`),
};

export const salesApi = {
  orders: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<SalesOrder> & {
        summary: { amount: number; pendingShipment: number };
      }
    >("/sales/orders", { params }),
  createOrder: (data: SalesOrderInput) =>
    api.post<any, SalesOrder>("/sales/orders", data),
  updateOrder: (id: string, data: SalesOrderInput) =>
    api.put<any, SalesOrder>(`/sales/orders/${id}`, data),
  confirmOrder: (id: string) =>
    api.patch<any, SalesOrder>(`/sales/orders/${id}/confirm`),
  cancelOrder: (id: string) =>
    api.patch<any, SalesOrder>(`/sales/orders/${id}/cancel`),
  removeOrder: (id: string) => api.delete(`/sales/orders/${id}`),
  shipments: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<SalesShipment> & { summary: { quantity: number } }>(
      "/sales/shipments",
      { params },
    ),
  createShipment: (data: {
    orderId: string;
    deliveryMethod: "offline" | "logistics";
    logisticsCompany?: string;
    trackingNo?: string;
    remark?: string;
    lines: Array<{ orderLineId: string; quantity: number }>;
  }) => api.post<any, SalesShipment>("/sales/shipments", data),
};

export const purchaseApi = {
  suppliers: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<Supplier>>("/purchase/suppliers", { params }),
  supplierOptions: () => api.get<any, Supplier[]>("/purchase/supplier-options"),
  createSupplier: (data: SupplierInput) =>
    api.post<any, Supplier>("/purchase/suppliers", data),
  updateSupplier: (id: string, data: SupplierInput) =>
    api.put<any, Supplier>(`/purchase/suppliers/${id}`, data),
  removeSupplier: (id: string) => api.delete(`/purchase/suppliers/${id}`),
  orders: (params?: Record<string, string | number | undefined>) =>
    api.get<
      any,
      Paged<PurchaseOrder> & {
        summary: { amount: number; pendingReceipt: number };
      }
    >("/purchase/orders", { params }),
  createOrder: (data: PurchaseOrderInput) =>
    api.post<any, PurchaseOrder>("/purchase/orders", data),
  updateOrder: (id: string, data: PurchaseOrderInput) =>
    api.put<any, PurchaseOrder>(`/purchase/orders/${id}`, data),
  confirmOrder: (id: string) =>
    api.patch<any, PurchaseOrder>(`/purchase/orders/${id}/confirm`),
  cancelOrder: (id: string) =>
    api.patch<any, PurchaseOrder>(`/purchase/orders/${id}/cancel`),
  removeOrder: (id: string) => api.delete(`/purchase/orders/${id}`),
  receipts: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<PurchaseReceipt>>("/purchase/receipts", { params }),
  createReceipt: (data: {
    orderId: string;
    remark?: string;
    lines: Array<{ orderLineId: string; quantity: number }>;
  }) => api.post<any, PurchaseReceipt>("/purchase/receipts", data),
};

export const financeApi = {
  receipts: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<FinanceTransaction> & { summary: { confirmedAmount: number; pendingAmount: number; totalCount: number } }>("/finance/receipts", { params }),
  payments: (params?: Record<string, string | number | undefined>) =>
    api.get<any, Paged<FinanceTransaction> & { summary: { confirmedAmount: number; pendingAmount: number; totalCount: number } }>("/finance/payments", { params }),
  receivableOrders: () => api.get<any, FinanceOrderOption[]>("/finance/receivable-orders"),
  payableOrders: () => api.get<any, FinanceOrderOption[]>("/finance/payable-orders"),
  createReceipt: (data: FinanceTransactionInput) => api.post<any, FinanceTransaction>("/finance/receipts", data),
  createPayment: (data: FinanceTransactionInput) => api.post<any, FinanceTransaction>("/finance/payments", data),
  confirmReceipt: (id: string) => api.patch<any, FinanceTransaction>(`/finance/receipts/${id}/confirm`),
  cancelReceipt: (id: string, reason: string) => api.patch<any, FinanceTransaction>(`/finance/receipts/${id}/cancel`, { reason }),
  confirmPayment: (id: string) => api.patch<any, FinanceTransaction>(`/finance/payments/${id}/confirm`),
  cancelPayment: (id: string, reason: string) => api.patch<any, FinanceTransaction>(`/finance/payments/${id}/cancel`, { reason }),
  statistics: (params: { year?: number; currency: string }) => api.get<any, FinanceStatistics>("/finance/statistics", { params }),
};
