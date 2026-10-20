import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.PRODUCTION_READ_ONLY_AUDIT === '1';
const baseUrl = process.env.FRONTEND_BASE_URL || '';
const account = process.env.E2E_TENANT_PHONE || '';
const password = process.env.E2E_TENANT_PASSWORD || '';

const routes = [
  '/dashboard', '/products', '/product-categories', '/customer',
  '/inventory/stocks', '/inventory/counts', '/inventory/transfers', '/inventory/warehouses',
  '/sales/orders', '/sales/shipments', '/purchase/orders', '/purchase/receipts', '/purchase/suppliers',
  '/finance/receipts', '/finance/payments', '/finance/statistics',
  '/storefront/leads', '/storefront/products', '/storefront/releases', '/storefront/settings',
  '/storefront-translations', '/settings', '/settings?tab=team', '/settings?tab=billing',
  '/system-settings', '/site-editor',
];

const login = async (page: Page) => {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('登录账号').fill(account);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
};

test.describe('production read-only performance audit', () => {
  test.skip(!enabled, 'Set PRODUCTION_READ_ONLY_AUDIT=1 explicitly to audit production');

  test('all tenant pages load without writes or server errors', async ({ page }) => {
    test.setTimeout(180_000);
    expect(baseUrl).toMatch(/^https:\/\//);
    expect(account).not.toBe('');
    expect(password).not.toBe('');
    await login(page);

    const serverErrors: string[] = [];
    const blockedWrites: string[] = [];
    page.on('response', response => {
      if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
    });
    await page.route('**/api/v1/**', async route => {
      if (route.request().method() === 'GET') return route.continue();
      blockedWrites.push(`${route.request().method()} ${route.request().url()}`);
      return route.abort('blockedbyclient');
    });

    const samples: Array<{ path: string; durationMs: number }> = [];
    for (const path of routes) {
      const startedAt = Date.now();
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
      samples.push({ path, durationMs: Date.now() - startedAt });
      await expect(page.getByTestId('admin-load-error')).toHaveCount(0);
      await expect(page.getByText('暂无访问权限')).toHaveCount(0);
    }

    console.table(samples);
    expect(blockedWrites, 'Page navigation attempted a mutating API request').toEqual([]);
    expect(serverErrors).toEqual([]);
  });
});
