export interface AuthUser {
  userId: string;
  account: string;
  role: 'system_admin' | 'admin' | 'member';
  tenantId: string;
  siteId: string;
  permissions?: string[];
}
