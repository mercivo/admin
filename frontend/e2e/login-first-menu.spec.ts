import { expect, test } from '@playwright/test';

test('登录后跳转到当前用户有权限的第一个菜单', async ({ page }) => {
  const permissions = ['group.site', 'menu.storefront.leads', 'page.storefront.leads', 'storefront.lead.manage'];
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.endsWith('/auth/login')) return route.fulfill({ json: { data: {
      accessToken: 'e2e-token',
      user: { userId: 'member-1', account: '13800000001', role: 'member', tenantId: 'tenant-1', siteId: 'site-1' },
      tenant: { id: 'tenant-1', name: '验收企业', permissions },
    } } });
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/storefront/leads')) return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 20 } } });
    if (url.includes('/storefront/overview')) return route.fulfill({ json: { data: { products: { total: 0, published: 0, pending: 0 }, leads: { total: 0, new: 0, following: 0, converted: 0 }, recentLeads: [] } } });
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('http://localhost:8088/login');
  await page.getByLabel('登录账号').fill('13800000001');
  await page.getByLabel('密码').fill('MemberPass123');
  await page.getByRole('button', { name: '安全登录' }).click();

  await expect(page).toHaveURL(/\/storefront\/leads$/);
  await expect(page.getByRole('heading', { name: '线索池' })).toBeVisible();
});
