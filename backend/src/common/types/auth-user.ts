export interface AuthUser {
  userId: string;
  account: string;
  role: 'system_admin' | 'admin' | 'editor' | 'viewer';
  tenantId: string;
  siteId: string;
}
