import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readLocalEnvironment = () => {
  const source = readFileSync(resolve(process.cwd(), '../.env.local'), 'utf8');
  return Object.fromEntries(source.split(/\r?\n/).flatMap(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    return separator < 0 ? [] : [[trimmed.slice(0, separator), trimmed.slice(separator + 1)]];
  }));
};

const unwrap = <T>(value: { data?: T } | T): T => value && typeof value === 'object' && 'data' in value ? (value as { data: T }).data : value as T;

const request = async <T>(base: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Playwright setup ${init?.method || 'GET'} ${path} failed with HTTP ${response.status}`);
  return unwrap(payload) as T;
};

const captchaCode = (image: string) => [...Buffer.from(image.split(',')[1], 'base64').toString('utf8').matchAll(/<text\b[^>]*>([^<])<\/text>/g)].map(match => match[1]).join('');

export default async function globalSetup() {
  const local = readLocalEnvironment();
  const apiBase = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
  const password = process.env.E2E_TENANT_PASSWORD || 'Mercivo@UAT2026';
  if (!process.env.E2E_TENANT_PHONE) {
    const phone = `139${Date.now().toString().slice(-8)}`;
    const captcha = await request<{ captchaId: string; image: string }>(apiBase, '/auth/captcha');
    const registration = await request<{ user: { tenantId: string; siteId: string }; tenant: { permissions?: string[] } }>(apiBase, '/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, tenantName: `PW-UAT-${Date.now()}`, captchaId: captcha.captchaId, captchaCode: captchaCode(captcha.image) }),
    });
    const systemPassword = process.env.E2E_SYSTEM_ADMIN_PASSWORD || local.SYSTEM_ADMIN_PASSWORD;
    if (!systemPassword) throw new Error('E2E_SYSTEM_ADMIN_PASSWORD or SYSTEM_ADMIN_PASSWORD is required');
    const systemLogin = await request<{ accessToken: string }>(apiBase, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: process.env.E2E_SYSTEM_ADMIN_USERNAME || local.SYSTEM_ADMIN_USERNAME || 'admin', password: systemPassword }),
    });
    await request(apiBase, `/system/tenants/${registration.user.tenantId}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${systemLogin.accessToken}` },
      body: JSON.stringify({
        maxProducts: 100,
        maxMembers: 10,
        maxWarehouses: 5,
        permissions: [...new Set([...(registration.tenant.permissions || []), 'site.publish'])],
        permissionsCustomized: true,
      }),
    });
    const tenantLogin = await request<{ accessToken: string }>(apiBase, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account: phone, password }),
    });
    await request(apiBase, `/admin/sites/${registration.user.siteId}/publish`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tenantLogin.accessToken}` },
      body: JSON.stringify({ releaseNote: 'Playwright 自动化验收首次发布' }),
    });
    process.env.E2E_TENANT_PHONE = phone;
    process.env.E2E_TENANT_PASSWORD = password;
    process.env.E2E_SYSTEM_ADMIN_PASSWORD = systemPassword;
    process.env.E2E_SYSTEM_ADMIN_USERNAME = process.env.E2E_SYSTEM_ADMIN_USERNAME || local.SYSTEM_ADMIN_USERNAME || 'admin';
    process.env.E2E_SITE_KEY = registration.user.tenantId;
  }
}
