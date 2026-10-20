import { expect, test } from '@playwright/test';

const fullPlan = { id: 'plan-standard', code: 'standard', name: '标准版', price: 1680, currency: 'CNY', billingCycle: 'year', description: '全部功能', maxProducts: 50, maxMembers: 5, maxWarehouses: 3, features: {}, permissions: ['page.dashboard'], enabled: true, sortOrder: 10 };
const upgradePlan = { ...fullPlan, id: 'plan-upgrade', code: 'upgrade', name: '专业版', price: 2680 };

test('login hides registration and system administrator helper copy', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await expect(page.getByLabel('登录账号')).toBeVisible();
  await expect(page.getByText('注册', { exact: true })).toHaveCount(0);
  await expect(page.getByText('系统管理员可使用专属账号登录', { exact: true })).toHaveCount(0);
});

test('login capability cards center icons above their labels', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  const cards = page.getByTestId('login-capability');
  await expect(cards).toHaveCount(2);
  for (const card of await cards.all()) {
    await expect(card).toHaveCSS('display', 'flex');
    await expect(card).toHaveCSS('flex-direction', 'column');
    await expect(card).toHaveCSS('align-items', 'center');
    await expect(card).toHaveCSS('text-align', 'center');
    const alignment = await card.evaluate(element => {
      const cardRect = element.getBoundingClientRect();
      const iconRect = element.querySelector('.anticon')!.getBoundingClientRect();
      const labelRect = element.querySelector('span:last-child')!.getBoundingClientRect();
      const center = (rect: DOMRect) => rect.left + rect.width / 2;
      return {
        iconOffset: Math.abs(center(iconRect) - center(cardRect)),
        labelOffset: Math.abs(center(labelRect) - center(cardRect)),
        iconAboveLabel: iconRect.bottom < labelRect.top,
      };
    });
    expect(alignment.iconOffset).toBeLessThan(1);
    expect(alignment.labelOffset).toBeLessThan(1);
    expect(alignment.iconAboveLabel).toBe(true);
  }
});

test('system administrator creates a tenant and resets its password', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'system-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'system_admin', account: 'admin' }));
  });
  let createPayload: any;
  let resetCalled = false;
  let statusPayload: any;
  const tenantQueries: Array<{ keyword: string | null; status: string | null }> = [];
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { role: 'system_admin', permissions: [] } } });
    if (url.includes('/system/plan-options') || url.includes('/system/plans')) return route.fulfill({ json: { data: [fullPlan] } });
    if (url.includes('/system/permissions')) return route.fulfill({ json: { data: [{ key: 'page.dashboard', label: '经营概览', group: '经营概览', type: 'page', level: 'page', parentKey: null }] } });
    if (url.endsWith('/system/tenants') && route.request().method() === 'POST') { createPayload = route.request().postDataJSON(); return route.fulfill({ json: { data: { tenant: { id: 'tenant-new' }, initialPassword: '12345678' } } }); }
    if (url.includes('/system/tenants/tenant-1/reset-password')) { resetCalled = true; return route.fulfill({ json: { data: { success: true, initialPassword: '12345678' } } }); }
    if (url.includes('/system/tenants/tenant-1') && route.request().method() === 'PATCH') { statusPayload = route.request().postDataJSON(); return route.fulfill({ json: { data: { id: 'tenant-1', ...statusPayload } } }); }
    if (url.includes('/system/tenants')) { const parsed = new URL(url); tenantQueries.push({ keyword: parsed.searchParams.get('keyword'), status: parsed.searchParams.get('status') }); return route.fulfill({ json: { data: { items: [{ id: 'tenant-1', name: '现有租户', slug: 'tenant-1', adminAccount: '13800000000', status: 'active', plan: 'standard', maxProducts: 50, maxMembers: 5, maxWarehouses: 3, expiresAt: null, permissions: ['page.dashboard'], permissionMode: 'plan', quotaMode: 'plan', usage: { products: 0, customers: 0, users: 4, sites: 1, warehouses: 1 }, defaultQuota: { maxProducts: 50, maxMembers: 5, maxWarehouses: 3 } }], total: 1, page: 1, pageSize: 10, summary: { maxProducts: 50, maxMembers: 5, maxWarehouses: 3 } } } }); }
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('http://localhost:8088/system/merchants');
  await expect(page.getByText('现有租户', { exact: true })).toHaveCount(1);
  await expect(page.getByText('13800000000', { exact: true })).toBeVisible();
  await page.getByPlaceholder('搜索租户名称、标识或管理员账号').fill('13800000000');
  await page.getByText('全部状态', { exact: true }).click();
  await page.getByText('正常', { exact: true }).last().click();
  await expect.poll(() => tenantQueries.some(query => query.keyword === '13800000000' && query.status === 'active')).toBe(true);
  await page.getByTitle('停用租户').click();
  await expect(page.getByText('该租户管理员及全部团队成员将立即无法登录和访问系统')).toBeVisible();
  await page.getByRole('button', { name: '确认停用' }).click();
  await expect.poll(() => statusPayload).toEqual({ status: 'suspended' });
  await page.getByRole('button', { name: '新增租户' }).click();
  await page.getByLabel('租户名称').fill('新租户');
  await page.getByLabel('管理员登录手机号').fill('13800000088');
  await page.getByRole('button', { name: '创建租户', exact: true }).click();
  await expect.poll(() => createPayload).toMatchObject({ name: '新租户', phone: '13800000088', plan: 'standard' });
  await page.getByTitle('重置管理员密码').click();
  await page.getByRole('button', { name: '确认重置' }).click();
  await expect.poll(() => resetCalled).toBe(true);
});

test('tenant account settings changes password and notification center is absent', async ({ page }) => {
  const permissions = ['page.dashboard', 'page.settings', 'page.settings.account', 'menu.settings'];
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'tenant-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', account: '13800000000', name: '验收租户' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '验收租户', permissions: value }));
  }, permissions);
  let passwordPayload: any;
  let subscribeCalled = false;
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/auth/change-password')) { passwordPayload = route.request().postDataJSON(); return route.fulfill({ json: { data: { success: true } } }); }
    if (url.includes('/workspace/subscriptions') && route.request().method() === 'POST') { subscribeCalled = true; return route.fulfill({ json: { data: {} } }); }
    if (url.includes('/workspace/subscription-orders')) return route.fulfill({ json: { data: [] } });
    if (url.includes('/workspace/plans')) return route.fulfill({ json: { data: [fullPlan, upgradePlan] } });
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: { account: { enterpriseName: '验收租户', phone: '13800000000', email: '', role: 'admin', joinedAt: '2026-01-01' }, site: { id: 'site-1', name: '站点', description: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' }, billing: { plan: 'standard', status: 'active', limits: { products: 50, members: 5, warehouses: 3 }, usage: { products: 0, members: 1, warehouses: 1 }, permissions } } } });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto('http://localhost:8088/settings?tab=account');
  await expect(page.getByText('通知中心', { exact: true })).toHaveCount(0);
  const accountMenus = page.getByRole('button').filter({ hasText: '验收租户' });
  await expect(accountMenus).toHaveCount(2);
  await accountMenus.first().click();
  await expect(page.locator('[role="menuitem"]:visible').filter({ hasText: '账号信息' }).first()).toBeVisible();
  await expect(page.locator('[role="menuitem"]:visible').filter({ hasText: '修改密码' }).first()).toBeVisible();
  await page.locator('[role="menuitem"]:visible').filter({ hasText: '修改密码' }).first().click();
  const passwordModal = page.getByRole('dialog', { name: '修改密码' });
  await expect(passwordModal).toBeVisible();
  const passwordInputs = passwordModal.locator('input[type="password"]');
  await expect(passwordInputs).toHaveCount(3);
  await passwordInputs.nth(0).fill('12345678');
  await passwordInputs.nth(1).fill('NewPassword123');
  await passwordInputs.nth(2).fill('NewPassword123');
  await passwordModal.getByRole('button', { name: '确认修改' }).click();
  await expect.poll(() => passwordPayload).toEqual({ currentPassword: '12345678', newPassword: 'NewPassword123' });
  await expect(passwordModal).toBeHidden();
  await accountMenus.last().click();
  await expect(page.locator('[role="menuitem"]:visible').filter({ hasText: '账号信息' }).last()).toBeVisible();
  await expect(page.locator('[role="menuitem"]:visible').filter({ hasText: '修改密码' }).last()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('http://localhost:8088/settings?tab=billing');
  await page.getByRole('button', { name: '立即订购' }).click();
  await expect(page.getByText('当前尚未接入在线支付体系，如需开通或变更套餐，请联系系统管理员。')).toBeVisible();
  await expect(page.getByRole('button', { name: '我知道了' })).toBeVisible();
  expect(subscribeCalled).toBe(false);
});
