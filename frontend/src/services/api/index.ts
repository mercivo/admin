import api from '../api';
import type { Product, ProductCategory } from '../../types';

// ---- 扩展类型定义 ----
export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  totalCustomers: number;
  topProducts: { name: string; stock: number; status: string }[];
  customerValue: number;
}

export interface TeamMember { id: string; name: string; email: string | null; phone?: string; role: string; permissions?: string[]; avatar: string; color: string; joinedAt: string; }
export interface WorkspaceSettings {
  account: { enterpriseName: string; phone: string; email: string; timezone: 'Asia/Shanghai'; role: string; joinedAt: string };
  site: { id: string; slug: string; name: string; description: string; defaultLanguage: string; defaultCurrency: string; domain: string; domainStatus: string; status: string };
  billing: { plan: string; status: string; expiresAt: string | null; limits: { products: number; members: number; sites: number; warehouses: number }; usage: { products: number; members: number; sites: number; warehouses: number }; sitePublishing: boolean; features: Record<string, boolean>; permissions: string[] };
}
export interface PlanItem { id: string; code: string; name: string; price: number; currency: string; billingCycle: 'month' | 'year'; description?: string; maxProducts: number; maxMembers: number; maxSites: number; maxWarehouses: number; features: Record<string, boolean>; permissions: string[]; enabled: boolean; sortOrder: number; }
export interface SubscriptionOrder { id: string; orderNo: string; planName: string; amount: number; currency: string; status: string; paymentStatus: string; effectiveAt: string; expiresAt: string | null; createdAt: string; }
export interface PermissionItem { group: string; key: string; label: string; type: 'menu' | 'page' | 'button'; level: 'primary' | 'secondary' | 'page' | 'button'; parentKey: string | null; }
export interface ManagedSite { id: string; tenantId: string; slug: string; name: string; status: 'draft' | 'published'; defaultLanguage: string; defaultCurrency: string; supportedLanguages?: string[]; publishedVersionId?: string; }
export interface SiteDomain { id: string; siteId: string; hostname: string; isPrimary: boolean; status: 'active' | 'disabled'; sslStatus: 'pending' | 'active' | 'failed'; verificationRecord?: { type: string; name: string; value: string } | null; routingRecord?: { type: string; name: string; value: string }; verifiedAt?: string | null; }
export interface SiteVersion { id: string; siteId: string; version: number; publishedAt: string; publishedBy: string; }
export interface Customer { id: string; name: string; company: string; phone: string | null; email: string; country: string; level: string; status: 'active' | 'disabled'; orders: number; totalAmount: number; lastOrderAt: string | null; notes?: string; }
export type CustomerInput = Pick<Customer, 'name' | 'email' | 'phone' | 'country' | 'level' | 'status' | 'notes'>;
export interface CustomerLevel { id: string; code: string; name: string; note: string; discountRate: number | null; }
export interface GuestPricingPolicy { mode: 'base' | 'hidden'; }
export interface Warehouse { id: string; name: string; contact: string; phone: string; address: string; status: 'active' | 'disabled'; isDefault: boolean; isLocked: boolean; activeCountId: string | null; activeCountDocumentNo: string | null; createdAt: string; }
export interface InventoryStock { id: string; warehouseId: string; warehouseName: string; productId: string; productName: string; productSku: string; variantKey: string; variantLabel: string; onHand: number; reserved: number; available: number; inTransit: number; warningStock: number; status: 'normal' | 'warning' | 'out'; updatedAt: string; }
export interface InventoryLedgerEntry { id: string; warehouseId: string; warehouseName: string; productId: string; productName: string; productSku: string; variantKey: string; variantLabel: string; type: 'opening' | 'count_adjust' | 'transfer_out' | 'transfer_in'; quantityChange: number; balanceAfter: number; referenceType: string; referenceId: string; referenceNo: string; actorUserId: string; remark: string; createdAt: string; }
export type WarehouseInput = Pick<Warehouse, 'name' | 'contact' | 'phone' | 'address' | 'status'>;
export interface StockCountLine { id: string; productId: string; variantKey: string; systemQuantity: number; countedQuantity: number | null; difference: number; }
export interface StockCount { id: string; documentNo: string; warehouseId: string; warehouseName: string; status: 'draft' | 'counting' | 'completed' | 'cancelled'; remark: string; lines: StockCountLine[]; createdAt: string; startedAt?: string; completedAt?: string; }
export interface StockTransferLine { id: string; productId: string; variantKey: string; quantity: number; }
export interface StockTransfer { id: string; documentNo: string; sourceWarehouseId: string; sourceWarehouseName: string; destinationWarehouseId: string; destinationWarehouseName: string; status: 'shipped' | 'received' | 'cancelled'; remark: string; lines: StockTransferLine[]; createdAt: string; shippedAt?: string; receivedAt?: string; }
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; }

// ---- Dashboard API ----
export const dashboardApi = {
  getStats: () => api.get<any, DashboardStats>('/dashboard/stats'),
};

// ---- Product API ----
export const productApi = {
  list: () => api.get<any, Product[]>('/product'),
  getById: (id: string) => api.get<any, Product>(`/product/${id}`),
  create: (data: Partial<Product>) => api.post<any, Product>('/product', data),
  update: (id: string, data: Partial<Product>) => api.put<any, Product>(`/product/${id}`, data),
  remove: (id: string) => api.delete(`/product/${id}`),
  getSeo: (id: string) => api.get<any, Product>(`/product/${id}/seo`),
  updateSeo: (id: string, data: Record<string, unknown>) => api.put<any, Product>(`/product/${id}/seo`, data),
  uploadImage: (file: File) => {
    const data = new FormData();
    data.append('file', file);
    return api.post<any, { url: string; objectName: string }>('/product/images', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};


// ---- Product Category API ----
export const productCategoryApi = {
  list: () => api.get<any, ProductCategory[]>('/product-categories'),
  create: (data: Record<string, unknown>) => api.post<any, ProductCategory>('/product-categories', data),
  update: (code: string, data: Record<string, unknown>) => api.put(`/product-categories/${code}`, data),
  remove: (code: string) => api.delete(`/product-categories/${code}`),
};

export const workspaceApi = {
  getSettings: () => api.get<any, WorkspaceSettings>('/workspace/settings'),
  updateAccount: (data: WorkspaceSettings['account']) => api.put<any, WorkspaceSettings>('/workspace/settings/account', { enterpriseName: data.enterpriseName, phone: data.phone, email: data.email, timezone: data.timezone }),
  updateSite: (data: Pick<WorkspaceSettings['site'], 'name' | 'description' | 'defaultLanguage' | 'defaultCurrency'>) => api.put('/workspace/settings/site', { name: data.name, description: data.description, defaultLanguage: data.defaultLanguage, defaultCurrency: data.defaultCurrency }),
  getConfig: <T>(key: string) => api.get<any, T>(`/workspace/config/${key}`),
  updateConfig: <T extends Record<string, unknown>>(key: string, value: T) => api.put<any, T>(`/workspace/config/${key}`, { value }),
  listTeam: () => api.get<any, TeamMember[]>('/workspace/team'),
  teamPermissions: () => api.get<any, PermissionItem[]>('/workspace/team/permissions'),
  createMember: (data: { name: string; email: string; password: string; role: string; permissions: string[] }) => api.post<any, TeamMember>('/workspace/team', data),
  updateMember: (id: string, data: { name?: string; role?: string; permissions?: string[] }) => api.put<any, TeamMember>(`/workspace/team/${id}`, data),
  deleteMember: (id: string) => api.delete(`/workspace/team/${id}`),
  listPlans: () => api.get<any, PlanItem[]>('/workspace/plans'),
  listSubscriptionOrders: () => api.get<any, SubscriptionOrder[]>('/workspace/subscription-orders'),
  subscribePlan: (planId: string) => api.post<any, SubscriptionOrder>('/workspace/subscriptions', { planId }),
};

export const siteApi = {
  list: () => api.get<any, ManagedSite[]>('/admin/sites'),
  update: (id: string, data: Partial<Pick<ManagedSite, 'name' | 'defaultLanguage' | 'supportedLanguages'>>) => api.put<any, ManagedSite>(`/admin/sites/${id}`, data),
  switchSite: (siteId: string) => api.post<any, { accessToken: string; user: Record<string, unknown> }>('/auth/switch-site', { siteId }),
  publish: (id: string) => api.post<any, SiteVersion>(`/admin/sites/${id}/publish`, { publishedBy: 'admin-ui' }),
  versions: (id: string) => api.get<any, SiteVersion[]>(`/admin/sites/${id}/versions`),
  rollback: (id: string, versionId: string) => api.post<any, SiteVersion>(`/admin/sites/${id}/rollback`, { versionId }),
  domains: (id: string) => api.get<any, SiteDomain[]>(`/admin/sites/${id}/domains`),
  addDomain: (siteId: string, hostname: string, isPrimary = true) => api.post<any, SiteDomain>(`/admin/sites/${siteId}/domains`, { hostname, isPrimary }),
  verifyDomain: (id: string) => api.post<any, SiteDomain>(`/admin/sites/domains/${id}/verify`),
  removeDomain: (id: string) => api.delete(`/admin/sites/domains/${id}`),
};

export const customerApi = {
  list: () => api.get<any, Customer[]>('/customers'),
  create: (data: CustomerInput) => api.post<any, Customer>('/customers', data),
  update: (id: string, data: CustomerInput) => api.put<any, Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  levels: () => api.get<any, CustomerLevel[]>('/customers/levels'),
  createLevel: (data: { name: string; note?: string; discountRate?: number | null }) => api.post<any, CustomerLevel>('/customers/levels', data),
  updateLevel: (id: string, data: { name: string; note?: string; discountRate?: number | null }) => api.put<any, CustomerLevel>(`/customers/levels/${id}`, data),
  removeLevel: (id: string) => api.delete(`/customers/levels/${id}`),
  pricingPolicy: () => api.get<any, GuestPricingPolicy>('/customers/pricing-policy'),
  updatePricingPolicy: (mode: GuestPricingPolicy['mode']) => api.put<any, GuestPricingPolicy>('/customers/pricing-policy', { mode }),
};

export const inventoryApi = {
  stocks: (params?: Record<string, string | number | undefined>) => api.get<any, Paged<InventoryStock> & { summary: { onHand: number; available: number; inTransit: number; warningItems: number } }>('/inventory/stocks', { params }),
  ledger: (params?: Record<string, string | number | undefined>) => api.get<any, Paged<InventoryLedgerEntry> & { summary: { inbound: number; outbound: number } }>('/inventory/ledger', { params }),
  warehouses: () => api.get<any, Warehouse[]>('/inventory/warehouses'),
  createWarehouse: (data: WarehouseInput) => api.post<any, Warehouse>('/inventory/warehouses', data),
  updateWarehouse: (id: string, data: WarehouseInput) => api.put<any, Warehouse>(`/inventory/warehouses/${id}`, data),
  setDefaultWarehouse: (id: string) => api.patch<any, Warehouse>(`/inventory/warehouses/${id}/default`),
  removeWarehouse: (id: string) => api.delete(`/inventory/warehouses/${id}`),
  counts: () => api.get<any, StockCount[]>('/inventory/counts'),
  createCount: (data: { warehouseId: string; remark?: string }) => api.post<any, StockCount>('/inventory/counts', data),
  updateCount: (id: string, data: { remark?: string; lines: Array<{ productId: string; variantKey: string; countedQuantity?: number }> }) => api.put<any, StockCount>(`/inventory/counts/${id}`, data),
  startCount: (id: string) => api.post<any, StockCount>(`/inventory/counts/${id}/start`),
  completeCount: (id: string) => api.post<any, StockCount>(`/inventory/counts/${id}/complete`),
  cancelCount: (id: string) => api.post<any, StockCount>(`/inventory/counts/${id}/cancel`),
  removeCount: (id: string) => api.delete(`/inventory/counts/${id}`),
  transfers: () => api.get<any, StockTransfer[]>('/inventory/transfers'),
  createTransfer: (data: { sourceWarehouseId: string; destinationWarehouseId: string; remark?: string; lines: Array<{ productId: string; variantKey: string; quantity: number }> }) => api.post<any, StockTransfer>('/inventory/transfers', data),
  receiveTransfer: (id: string) => api.post<any, StockTransfer>(`/inventory/transfers/${id}/receive`),
  removeTransfer: (id: string) => api.delete(`/inventory/transfers/${id}`),
};
