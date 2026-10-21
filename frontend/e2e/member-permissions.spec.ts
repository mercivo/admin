import { expect, test } from '@playwright/test';

const permissions = ['group.system', 'menu.team', 'page.settings.team', 'settings.team'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '验收企业', permissions: value }));
  }, permissions);
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.endsWith('/workspace/settings')) return route.fulfill({ json: { data: {
      account: { enterpriseName: '验收企业', phone: '13800000000', email: '', timezone: 'Asia/Shanghai', role: 'admin', joinedAt: '2026-01-01T00:00:00.000Z' },
      site: { id: 'site-1', slug: 'demo', name: '验收站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY', domain: '', domainStatus: 'unconfigured', status: 'draft' },
      billing: { plan: 'trial', status: 'active', expiresAt: null, limits: { products: 20, members: 5, warehouses: 1 }, usage: { products: 0, members: 1, warehouses: 1 }, sitePublishing: false, features: {}, permissions },
    } } });
    if (url.endsWith('/workspace/team/permissions')) return route.fulfill({ json: { data: [
      { group: '系统管理', key: 'group.system', label: '系统管理', type: 'menu', level: 'primary', parentKey: null },
      { group: '系统管理', key: 'menu.team', label: '成员与权限', type: 'menu', level: 'secondary', parentKey: 'group.system' },
      { group: '成员与权限', key: 'page.settings.team', label: '成员与权限页面', type: 'page', level: 'page', parentKey: 'menu.team' },
      { group: '成员与权限', key: 'settings.team', label: '管理成员权限', type: 'button', level: 'button', parentKey: 'menu.team' },
    ] } });
    if (url.endsWith('/workspace/team')) return route.fulfill({ json: { data: [
      { id: 'admin-1', name: '企业管理员', email: '', phone: '13800000000', role: 'admin', status: 'active', permissions: [], joinedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'member-1', name: '销售小李', email: '', phone: '13900000000', role: 'member', status: 'active', permissions: [], joinedAt: '2026-01-02T00:00:00.000Z' },
    ] } });
    return route.fulfill({ json: { data: {} } });
  });
});

test('成员字段以手机号为登录账号，点击权限文字不会误选', async ({ page }) => {
  await page.goto('http://localhost:8088/settings');
  await expect(page.getByText('企业名称', { exact: true }).locator('..').locator('input')).toBeEnabled();
  await expect(page.getByText('手机号', { exact: true }).locator('..').locator('input')).toBeDisabled();
  await page.goto('http://localhost:8088/settings?tab=team');
  await expect(page.getByRole('button', { name: '企业 验收企业', exact: true })).toBeVisible();
  await expect(page.getByTestId('team-member-avatar')).toHaveText(['理员', '小李']);
  await page.getByRole('button', { name: '添加成员' }).click();
  await expect(page.getByText('邮箱地址（选填）')).toBeVisible();
  await expect(page.getByText('手机号（登录账号）')).toBeVisible();
  await expect(page.getByPlaceholder('至少 8 位，成员首次登录使用')).toBeVisible();
  await expect(page.getByText('观察者')).toHaveCount(0);
  await expect(page.getByText('编辑者')).toHaveCount(0);

  await expect(page.getByText('已选 0 项')).toBeVisible();
  await page.getByTestId('permission-label').filter({ hasText: '成员与权限' }).first().click();
  await expect(page.getByText('已选 0 项')).toBeVisible();
  await page.getByRole('checkbox', { name: '选择成员与权限', exact: true }).check();
  await expect(page.getByText('已选 4 项')).toBeVisible();
});
