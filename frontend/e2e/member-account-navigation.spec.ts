import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'member-account-e2e');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'member', account: '13900000000', name: '销售小李' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '验收企业', permissions: ['page.dashboard', 'menu.dashboard'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.dashboard', 'menu.dashboard'] } } });
    if (url.endsWith('/workspace/settings/account') && route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      return route.fulfill({ json: { data: {
        account: { enterpriseName: '验收企业', memberName: payload.memberName, phone: '13900000000', email: payload.email, timezone: 'Asia/Shanghai', role: 'member', joinedAt: '2026-01-02T00:00:00.000Z' },
        site: { id: 'site-1', slug: 'demo', name: '验收站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY', domain: '', domainStatus: 'unconfigured', status: 'draft' },
        billing: { plan: 'trial', status: 'active', expiresAt: null, limits: { products: 20, members: 5, warehouses: 1 }, usage: { products: 0, members: 2, warehouses: 1 }, sitePublishing: false, features: {}, permissions: ['page.dashboard', 'menu.dashboard', 'group.products', 'menu.products', 'page.products'] },
      } } });
    }
    if (url.endsWith('/workspace/settings')) return route.fulfill({ json: { data: {
      account: { enterpriseName: '验收企业', memberName: '销售小李', phone: '13900000000', email: 'li@example.com', timezone: 'Asia/Shanghai', role: 'member', joinedAt: '2026-01-02T00:00:00.000Z' },
      site: { id: 'site-1', slug: 'demo', name: '验收站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY', domain: '', domainStatus: 'unconfigured', status: 'draft' },
      billing: { plan: 'trial', status: 'active', expiresAt: null, limits: { products: 20, members: 5, warehouses: 1 }, usage: { products: 0, members: 2, warehouses: 1 }, sitePublishing: false, features: {}, permissions: ['page.dashboard', 'menu.dashboard', 'group.products', 'menu.products', 'page.products'] },
    } } });
    if (url.includes('/dashboard')) return route.fulfill({ json: { data: {} } });
    if (url.includes('/storefront/overview')) return route.fulfill({ json: { data: { recentLeads: [] } } });
    return route.fulfill({ json: { data: {} } });
  });
});

test('成员显示姓名、可访问账号信息，套餐账单只给软提示', async ({ page }) => {
  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/dashboard`);
  await expect(page.getByRole('link', { name: '站点设计' })).toHaveCount(0);
  await expect(page.getByText('商品列表', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /销售小李 13900000000/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /销售小李/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /销售小李 13900000000/ }).click();
  await expect(page.getByText('查看前台', { exact: true })).toHaveCount(0);
  await page.getByText('账号信息', { exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: '账号信息' })).toBeVisible();
  await expect(page.getByText('暂无访问权限')).toHaveCount(0);
  const memberName = page.getByText('成员姓名', { exact: true }).locator('..').locator('input');
  const enterpriseName = page.getByText('企业名称', { exact: true }).locator('..').locator('input');
  const email = page.getByText('邮箱', { exact: true }).locator('..').locator('input');
  const phone = page.getByText('手机号', { exact: true }).locator('..').locator('input');
  await expect(memberName).toBeEnabled();
  await expect(email).toBeEnabled();
  await expect(enterpriseName).toBeDisabled();
  await expect(phone).toBeDisabled();
  await memberName.fill('销售小王');
  await email.fill('wang@example.com');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByRole('button', { name: /销售小王 13900000000/ })).toBeVisible();
  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/dashboard`);
  await expect(page.getByText('商品列表', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /销售小李 13900000000/ }).click();
  await page.getByText('套餐账单', { exact: true }).click();
  await expect(page.getByText('请联系商户管理员或检查当前套餐权限。')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
});
