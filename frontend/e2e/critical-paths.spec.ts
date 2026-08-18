import { expect, test } from '@playwright/test';

test('language can switch globally and persists after reload', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByRole('button', { name: '切换到英文' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Phone / system administrator account')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('customer can open the published storefront', async ({ page }) => {
  await page.goto('http://localhost');
  await expect(page).toHaveTitle(/EcoBags Official/);
  await expect(page.getByRole('heading', { name: /Responsible products/i })).toBeVisible();
  await expect(page.locator('.product')).toHaveCount(5);
});

test('merchant admin must authenticate and can load products', async ({ page }) => {
  await page.goto('http://localhost:8088/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const accountInput = page.getByLabel('手机号 / 系统管理员账号');
  await accountInput.focus();
  await expect(accountInput).toBeFocused();
  expect(await accountInput.evaluate(element => getComputedStyle(element).lineHeight)).toBe('28px');
  expect(await accountInput.evaluate(element => getComputedStyle(element).height)).toBe('28px');
  await accountInput.fill('13800000000');
  await page.getByLabel('密码').fill('TenantAdmin@2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '仪表盘' })).toBeVisible();
  await page.getByRole('button', { name: '外贸 ERP' }).click();
  await page.getByText('商品管理', { exact: true }).first().click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText('Eco Shopping Bag')).toBeVisible();
});

test('product creation uses real rich text and cloud image controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
  });
  await page.route('**/api/v1/workspace/settings', route => route.fulfill({ json: { data: { site: { defaultCurrency: 'CNY' } } } }));
  await page.route('**/api/v1/dict/tree', route => route.fulfill({ json: { data: [{ id: 'category', children: [{ code: 'bags', label: '箱包', status: 'enabled', children: [] }] }] } }));
  await page.goto('http://localhost:8088/products/new');
  await expect(page.getByRole('heading', { name: '新建商品' })).toBeVisible();
  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.fill('自动化富文本描述');
  await page.getByRole('button', { name: '粗体' }).click();
  await page.getByRole('button', { name: '无序列表' }).click();
  await expect(editor.locator('ul')).toBeVisible();
  await page.getByRole('button', { name: '无序列表' }).click();
  await page.getByRole('button', { name: '有序列表' }).click();
  await expect(editor.locator('ol')).toBeVisible();
  await page.getByRole('button', { name: '有序列表' }).click();
  await page.getByRole('button', { name: '引用' }).click();
  await expect(editor.locator('blockquote')).toBeVisible();
  await expect(page.getByRole('button', { name: '上传图片到商品描述' })).toBeVisible();
  await expect(page.getByTestId('rich-text-image-input')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  await expect(page.getByText('上传图片')).toBeVisible();
  const imageInput = page.getByTestId('product-image-input');
  await expect(imageInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  await page.getByRole('button', { name: '规格库存' }).click();
  await expect(page.getByText('商品编码', { exact: true })).toBeVisible();
});

test('tenant operations modules load their production APIs', async ({ page }) => {
  const apiErrors: string[] = [];
  page.on('response', response => { if (response.url().includes('/api/v1/') && response.status() >= 400) apiErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('手机号 / 系统管理员账号').fill('13800000000');
  await page.getByLabel('密码').fill('TenantAdmin@2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();

  const modules = [
    { path: '/products', heading: '商品管理', api: '/api/v1/product' },
    { path: '/customer-levels', heading: '客户等级', api: '/api/v1/customers' },
    { path: '/leads', heading: '线索管理', api: '/api/v1/lead' },
    { path: '/ai-center', heading: '智能体中心', api: '/api/v1/agent' },
    { path: '/settings', heading: '设置', api: '/api/v1/workspace/config/settings' },
    { path: '/dict-mgmt', heading: '字典管理', api: '/api/v1/dict/tree' },
  ];
  for (const module of modules) {
    const responsePromise = page.waitForResponse(response => response.url().includes(module.api) && response.request().method() === 'GET');
    await page.goto(`http://localhost:8088${module.path}`);
    expect((await responsePromise).status()).toBe(200);
    await expect(page.getByRole('heading', { name: module.heading, exact: true })).toBeVisible();
  }

  const siteResponse = page.waitForResponse(response => response.url().includes('/api/v1/admin/sites') && response.request().method() === 'GET');
  await page.goto('http://localhost:8088/site-editor');
  expect((await siteResponse).status()).toBe(200);
  await expect(page.getByText('迈犀沃建站', { exact: true })).toBeVisible();
  expect(apiErrors).toEqual([]);
});

test('system administrator can view and control all merchants', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('手机号 / 系统管理员账号').fill('admin');
  await page.getByLabel('密码').fill('aihubflux@2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/system\/overview$/);
  await expect(page.getByRole('heading', { name: '全商户运营概览' })).toBeVisible();
  await page.getByRole('button', { name: '平台管理', exact: true }).last().click();
  await page.getByRole('button', { name: /配额管理/ }).click();
  await expect(page.getByRole('heading', { name: '配额管理' })).toBeVisible();
  await expect(page.getByText(/套餐默认|定制配额/).first()).toBeVisible();
  const merchantSearch = page.getByPlaceholder('搜索商户名称或标识');
  await expect(merchantSearch).toBeVisible();
  await merchantSearch.focus();
  await expect(merchantSearch).toBeFocused();
  expect(await merchantSearch.evaluate(element => getComputedStyle(element).lineHeight)).toBe('28px');
});

test('registration shows a graphical captcha and account fields', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByText('注册', { exact: true }).click();
  await expect(page.getByLabel('企业/店铺名称')).toBeVisible();
  await expect(page.getByLabel('手机号')).toBeVisible();
  const passwordBox = await page.getByLabel('登录密码').boundingBox();
  const confirmBox = await page.getByLabel('确认密码').boundingBox();
  expect(passwordBox).not.toBeNull();
  expect(confirmBox).not.toBeNull();
  expect(confirmBox!.y).toBeGreaterThan(passwordBox!.y + passwordBox!.height);
  expect(Math.abs(confirmBox!.width - passwordBox!.width)).toBeLessThan(2);
  await expect(page.getByAltText('图形验证码')).toBeVisible();
});
