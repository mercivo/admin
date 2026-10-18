import { expect, test, type Page } from '@playwright/test';

const baseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:8088';

const login = async (page: Page, account: string, password: string) => {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel('登录账号').fill(account);
  await page.getByLabel('密码').fill(password);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
};

const installReadDelay = async (page: Page) => {
  await page.route('**/api/v1/**', async route => {
    if (route.request().method() === 'GET') await new Promise(resolve => setTimeout(resolve, 1000));
    await route.continue();
  });
};

const auditPage = async (page: Page, path: string, errors: string[]) => {
  errors.length = 0;
  const navigation = page.goto(`${baseUrl}${path}`);
  const skeleton = page.locator('.ant-skeleton').first();
  await expect.soft(skeleton, `${path} 首次进入应显示骨架屏`).toBeVisible({ timeout: 2500 });
  await navigation;
  const pathname = new URL(path, baseUrl).pathname;
  await expect.soft(page).toHaveURL(new RegExp(`${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?|$)`));
  await expect.soft(page.locator('.ant-skeleton'), `${path} 请求完成后骨架屏应消失`).toHaveCount(0, { timeout: 15000 });
  await expect.soft(page.getByTestId('admin-load-error'), `${path} 不应进入加载失败态`).toHaveCount(0);
  await expect.soft(page.getByText('暂无访问权限'), `${path} 应具备访问权限`).toHaveCount(0);
  expect.soft(errors, `${path} 不应产生页面或控制台异常`).toEqual([]);

  errors.length = 0;
  const reload = page.reload();
  await expect.soft(page.locator('.ant-skeleton').first(), `${path} 刷新时应显示骨架屏`).toBeVisible({ timeout: 2500 });
  await reload;
  await expect.soft(page.locator('.ant-skeleton'), `${path} 刷新完成后骨架屏应消失`).toHaveCount(0, { timeout: 15000 });
  await expect.soft(page.getByTestId('admin-load-error')).toHaveCount(0);
  expect.soft(errors, `${path} 刷新后不应产生页面或控制台异常`).toEqual([]);
};

test('逐页打开和刷新租户后台功能页面', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, process.env.E2E_TENANT_PHONE!, process.env.E2E_TENANT_PASSWORD!);
  const productId = await page.evaluate(async () => {
    const token = localStorage.getItem('mercivo_access_token') || '';
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const categoryResponse = await fetch('/api/v1/product-categories', { method: 'POST', headers, body: JSON.stringify({ label: `加载态分类-${Date.now()}`, sort: 1, status: 'enabled', remark: '' }) });
    if (!categoryResponse.ok) throw new Error(`创建验收分类失败: ${categoryResponse.status}`);
    const categoryPayload = await categoryResponse.json();
    const category = categoryPayload.data || categoryPayload;
    const productResponse = await fetch('/api/v1/product', { method: 'POST', headers, body: JSON.stringify({ nameZh: '加载态验收商品', sku: `LOAD-${Date.now()}`, description: '用于后台加载态验收', basePrice: 10, moq: 1, category: category.code, img: '', images: [], status: 'pending', variants: [], tags: [] }) });
    if (!productResponse.ok) throw new Error(`创建验收商品失败: ${productResponse.status}`);
    const productPayload = await productResponse.json();
    return String((productPayload.data || productPayload).id);
  });
  await installReadDelay(page);
  const errors: string[] = [];
  let currentPath = '';
  page.on('pageerror', error => errors.push(`${currentPath}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon') && !message.text().includes('[antd:')) errors.push(`${currentPath}: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 500) errors.push(`${currentPath}: HTTP ${response.status()} ${response.url()}`); });
  await page.goto(`${baseUrl}/login`);

  const routes = [
    '/dashboard', '/products', '/products/new', `/products/${productId}`, `/products/${productId}/edit`, '/customer', '/product-categories',
    '/inventory/stocks', '/inventory/counts', '/inventory/transfers', '/inventory/warehouses',
    '/sales/orders', '/sales/shipments', '/purchase/orders', '/purchase/receipts', '/purchase/suppliers',
    '/finance/receipts', '/finance/payments', '/finance/statistics',
    '/storefront/leads', '/storefront/products', '/storefront/releases', '/storefront/settings',
    '/storefront-translations', '/settings', '/settings?tab=team', '/settings?tab=billing',
    '/system-settings', '/site-editor',
  ];
  for (const path of routes) {
    currentPath = path;
    await test.step(`${path} 打开与刷新`, async () => auditPage(page, path, errors));
  }
});

test('逐页打开和刷新系统管理功能页面', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page, process.env.E2E_SYSTEM_ADMIN_USERNAME!, process.env.E2E_SYSTEM_ADMIN_PASSWORD!);
  await installReadDelay(page);
  const errors: string[] = [];
  let currentPath = '';
  page.on('pageerror', error => errors.push(`${currentPath}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('favicon') && !message.text().includes('[antd:')) errors.push(`${currentPath}: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 500) errors.push(`${currentPath}: HTTP ${response.status()} ${response.url()}`); });
  await page.goto(`${baseUrl}/login`);
  for (const path of ['/system/overview', '/system/merchants', '/system/quotas', '/system/plans', '/system/orders']) {
    currentPath = path;
    await test.step(`${path} 打开与刷新`, async () => auditPage(page, path, errors));
  }
});
