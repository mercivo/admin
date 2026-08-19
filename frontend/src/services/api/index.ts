import api from '../api';
import type { Product, Lead, Agent, DictType, ChatMsg } from '../../types';

// ---- 扩展类型定义 ----
export interface DashboardStats {
  totalProducts: number;
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  topProducts: { name: string; views: number; inquiries: number; rate: number }[];
  recentLeads: Lead[];
  aiChats: number;
  aiLeads: number;
  activeAgents: number;
  aiSatisfaction: number;
  customerValue: number;
  traffic: { day: string; visitors: number; leads: number; aiChats: number }[];
}

export interface TeamMember { id: string; name: string; email: string | null; phone?: string; role: string; permissions?: string[]; avatar: string; color: string; joinedAt: string; }
export interface WorkspaceSettings {
  account: { enterpriseName: string; phone: string; email: string; timezone: 'Asia/Shanghai'; role: string; joinedAt: string };
  site: { id: string; slug: string; name: string; description: string; defaultLanguage: string; defaultCurrency: string; domain: string; domainStatus: string; status: string };
  billing: { plan: string; status: string; expiresAt: string | null; limits: { products: number; agents: number; members: number }; sitePublishing: boolean; features: Record<string, boolean>; permissions: string[] };
}
export interface PlanItem { id: string; code: string; name: string; price: number; currency: string; billingCycle: 'month' | 'year'; description?: string; maxProducts: number; maxAgents: number; maxMembers: number; maxSites: number; features: Record<string, boolean>; permissions: string[]; enabled: boolean; sortOrder: number; }
export interface SubscriptionOrder { id: string; orderNo: string; planName: string; amount: number; currency: string; status: string; paymentStatus: string; effectiveAt: string; expiresAt: string | null; createdAt: string; }
export interface PermissionItem { group: string; key: string; label: string; type: 'menu' | 'button'; level: 'primary' | 'secondary' | 'button'; parentKey: string | null; }
export interface KnowledgeFile { id: string; name: string; type: string; size: string; status: string; chunks: number; createdAt: string; }
export interface AgentPreset { id: string; code: string; name: string; description: string; agentType: 'sales' | 'translation' | 'sourcing'; model: string; lang: string; systemPrompt?: string | null; icon: string; color: string; enabled: boolean; sortOrder: number; }
export interface ChatSession { id: string; title: string; starred: boolean; createdAt: string; updatedAt: string; }
export interface ManagedSite { id: string; tenantId: string; slug: string; name: string; status: 'draft' | 'published'; defaultLanguage: string; defaultCurrency: string; supportedLanguages?: string[]; translationAgentId?: string | null; publishedVersionId?: string; }
export interface SiteDomain { id: string; siteId: string; hostname: string; isPrimary: boolean; status: 'active' | 'disabled'; sslStatus: 'pending' | 'active' | 'failed'; verificationRecord?: { type: string; name: string; value: string } | null; routingRecord?: { type: string; name: string; value: string }; verifiedAt?: string | null; }
export interface SiteVersion { id: string; siteId: string; version: number; publishedAt: string; publishedBy: string; }
export interface Customer { id: string; name: string; company: string; phone: string; email: string; country: string; level: string; status: 'active' | 'disabled'; orders: number; totalAmount: number; lastOrderAt: string | null; notes?: string; }
export interface CustomerLevel { id: string; code: string; name: string; note: string; }
export interface GuestPricingPolicy { mode: 'base' | 'hidden'; }
export interface Opportunity { id: string; company: string; contact: string; email: string; country: string; product: string; value: number; probability: number; owner: string; nextFollowUp: string | null; stage: string; source: string; notes?: string; }
export interface OutreachCampaign { id: string; name: string; audienceType: 'customers' | 'leads'; audienceLabel: string; subject: string; content: string; status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused'; scheduledAt: string | null; recipientCount: number; sentCount: number; openCount: number; replyCount: number; updatedAt: string; }
export interface OutreachStats { campaigns: number; sent: number; pending: number; openRate: number; replyRate: number; }

type AgentRecord = Omit<Agent, 'desc'> & { agentId?: string; description?: string; desc?: string };
const normalizeAgent = (agent: AgentRecord): Agent => ({
  ...agent,
  desc: agent.desc ?? agent.description ?? '',
});
const toAgentPayload = (data: Partial<Agent>, isCreate = false) => ({
  ...(isCreate ? { agentId: data.id || `agent-${Date.now()}` } : {}),
  ...(data.name !== undefined ? { name: data.name } : {}),
  ...(data.desc !== undefined ? { description: data.desc } : {}),
  ...(data.status !== undefined ? { status: data.status } : {}),
  ...(data.model !== undefined ? { model: data.model } : {}),
  ...(data.lang !== undefined ? { lang: data.lang } : {}),
  ...(data.agentType !== undefined ? { agentType: data.agentType } : {}),
  ...(data.systemPrompt !== undefined ? { systemPrompt: data.systemPrompt } : {}),
  ...(data.chats !== undefined ? { chats: data.chats } : {}),
  ...(data.leads !== undefined ? { leads: data.leads } : {}),
  ...(data.rate !== undefined ? { rate: data.rate } : {}),
  ...(data.satisfaction !== undefined ? { satisfaction: data.satisfaction } : {}),
  ...(data.icon !== undefined ? { icon: data.icon } : {}),
  ...(data.color !== undefined ? { color: data.color } : {}),
});
type LeadRecord = Lead & { createdAt?: string };
const normalizeLead = (lead: LeadRecord): Lead => ({
  ...lead,
  time: lead.time || (lead.createdAt ? new Date(lead.createdAt).toLocaleString('zh-CN') : ''),
});

// ---- Dashboard API ----
export const dashboardApi = {
  getStats: () => api.get<any, DashboardStats & { recentLeads: LeadRecord[] }>('/dashboard/stats').then(data => ({ ...data, recentLeads: data.recentLeads.map(normalizeLead) })),
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

// ---- Lead API ----
export const leadApi = {
  list: () => api.get<any, LeadRecord[]>('/lead').then(items => items.map(normalizeLead)),
  getById: (id: string) => api.get<any, LeadRecord>(`/lead/${id}`).then(normalizeLead),
  create: (data: Partial<Lead>) => api.post<any, LeadRecord>('/lead', data).then(normalizeLead),
  update: (id: string, data: Partial<Lead>) => api.put<any, LeadRecord>(`/lead/${id}`, data).then(normalizeLead),
  remove: (id: string) => api.delete(`/lead/${id}`),
  convert: (id: string) => api.post<any, { lead: LeadRecord; customer: Customer; opportunity: Opportunity }>(`/lead/${id}/convert`).then(data => ({ ...data, lead: normalizeLead(data.lead) })),
};

// ---- Agent API ----
export const agentApi = {
  list: () => api.get<any, AgentRecord[]>('/agent').then(items => items.map(normalizeAgent)),
  getById: (agentId: string) => api.get<any, AgentRecord>(`/agent/${agentId}`).then(normalizeAgent),
  create: (data: Partial<Agent>) => api.post<any, AgentRecord>('/agent', toAgentPayload(data, true)).then(normalizeAgent),
  update: (agentId: string, data: Partial<Agent>) => api.put<any, AgentRecord>(`/agent/${agentId}`, toAgentPayload(data)).then(normalizeAgent),
  remove: (agentId: string) => api.delete(`/agent/${agentId}`),
  listPresets: () => api.get<any, AgentPreset[]>('/agent/presets/catalog'),
  installPreset: (presetId: string) => api.post<any, AgentRecord>('/agent/presets/install', { presetId }).then(normalizeAgent),
};

// ---- Dict API ----
export const dictApi = {
  getTree: () => api.get<any, DictType[]>('/dict/tree'),
  getTypes: () => api.get<any, { id: string; typeId: string; label: string; icon: string }[]>('/dict/types'),
  getEntries: (typeId: string) => api.get(`/dict/${typeId}/entries`),
  createEntry: (typeId: string, data: Record<string, unknown>) => api.post(`/dict/${typeId}/entries`, data),
  updateEntry: (typeId: string, code: string, data: Record<string, unknown>) => api.put(`/dict/${typeId}/entries/${code}`, data),
  deleteEntry: (typeId: string, code: string) => api.delete(`/dict/${typeId}/entries/${code}`),
};

// ---- Chat API ----
export const chatApi = {
  getMessages: (sessionId: string) => api.get<any, ChatMsg[]>(`/chat/${sessionId}`),
  sendMessage: (sessionId: string, text: string) => api.post<any, ChatMsg>('/chat/send', { sessionId, text }),
  createMessage: (data: { sessionId: string; type: string; text?: string; productData?: Record<string, string> }) =>
    api.post<any, ChatMsg>('/chat/message', data),
  listSessions: () => api.get<any, ChatSession[]>('/chat/sessions/list'),
  createSession: () => api.post<any, ChatSession>('/chat/sessions'),
  updateSession: (id: string, data: { title?: string; starred?: boolean }) => api.put<any, ChatSession>(`/chat/sessions/${id}`, data),
  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`),
  clearSession: (id: string) => api.delete(`/chat/sessions/${id}/messages`),
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
  listKnowledge: () => api.get<any, KnowledgeFile[]>('/workspace/knowledge'),
  createKnowledge: (file: File) => {
    const data = new FormData();
    data.append('file', file);
    return api.post<any, KnowledgeFile>('/workspace/knowledge', data, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteKnowledge: (id: string) => api.delete(`/workspace/knowledge/${id}`),
  listPlans: () => api.get<any, PlanItem[]>('/workspace/plans'),
  listSubscriptionOrders: () => api.get<any, SubscriptionOrder[]>('/workspace/subscription-orders'),
  subscribePlan: (planId: string) => api.post<any, SubscriptionOrder>('/workspace/subscriptions', { planId }),
};

export const siteApi = {
  list: () => api.get<any, ManagedSite[]>('/admin/sites'),
  update: (id: string, data: Partial<Pick<ManagedSite, 'name' | 'defaultLanguage' | 'supportedLanguages' | 'translationAgentId'>>) => api.put<any, ManagedSite>(`/admin/sites/${id}`, data),
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
  create: (data: Omit<Customer, 'id'>) => api.post<any, Customer>('/customers', data),
  update: (id: string, data: Omit<Customer, 'id'>) => api.put<any, Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  levels: () => api.get<any, CustomerLevel[]>('/customers/levels'),
  createLevel: (data: { name: string; note?: string }) => api.post<any, CustomerLevel>('/customers/levels', data),
  updateLevel: (id: string, data: { name: string; note?: string }) => api.put<any, CustomerLevel>(`/customers/levels/${id}`, data),
  removeLevel: (id: string) => api.delete(`/customers/levels/${id}`),
  pricingPolicy: () => api.get<any, GuestPricingPolicy>('/customers/pricing-policy'),
  updatePricingPolicy: (mode: GuestPricingPolicy['mode']) => api.put<any, GuestPricingPolicy>('/customers/pricing-policy', { mode }),
};

export const opportunityApi = {
  list: () => api.get<any, Opportunity[]>('/opportunities'),
  create: (data: Omit<Opportunity, 'id'>) => api.post<any, Opportunity>('/opportunities', data),
  update: (id: string, data: Omit<Opportunity, 'id'>) => api.put<any, Opportunity>(`/opportunities/${id}`, data),
  remove: (id: string) => api.delete(`/opportunities/${id}`),
};

export const outreachApi = {
  list: () => api.get<any, OutreachCampaign[]>('/outreach'),
  stats: () => api.get<any, OutreachStats>('/outreach/stats'),
  create: (data: Pick<OutreachCampaign, 'name' | 'audienceType' | 'audienceLabel' | 'subject' | 'content'>) => api.post<any, OutreachCampaign>('/outreach', data),
  update: (id: string, data: Partial<Pick<OutreachCampaign, 'name' | 'audienceType' | 'audienceLabel' | 'subject' | 'content'>>) => api.put<any, OutreachCampaign>(`/outreach/${id}`, data),
  schedule: (id: string, scheduledAt: string) => api.post<any, OutreachCampaign>(`/outreach/${id}/schedule`, { scheduledAt }),
  remove: (id: string) => api.delete(`/outreach/${id}`),
};
