import { expect, test } from '@playwright/test';

const auth = async (page: import('@playwright/test').Page, permissions: string[]) => {
  await page.addInitScript(({ permissions }) => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '加载态测试企业', permissions }));
  }, { permissions });
};

test('经营概览首载显示骨架且不先渲染零指标', async ({ page }) => {
  const permissions = ['page.dashboard', 'menu.dashboard'];
  await auth(page, permissions);
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/storefront/overview')) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return route.fulfill({ json: { data: { leads: { total: 1, new: 1, following: 0, converted: 0 }, recentLeads: [] } } });
    }
    if (url.includes('/dashboard')) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return route.fulfill({ json: { data: {
        defaultCurrency: 'CNY', currencies: [{ code: 'CNY', symbol: '¥', name: '人民币' }],
        financials: [{ currency: 'CNY', currentMonthSales: 100, salesAmount: 100, currentMonthPurchases: 20, purchaseAmount: 20, receipts: 80, payments: 10 }],
        orders: { salesOpen: 2, purchaseOpen: 1 }, risks: { lowStock: 0, pendingFunds: 0, pendingProducts: 0 }, totalCustomers: 3,
        monthlyOrders: [], topSellingProducts: [], categoryDistribution: [], lowStockProducts: [], latestSalesOrders: [],
      } } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('/dashboard');
  await expect(page.getByTestId('admin-page-skeleton')).toBeVisible();
  await expect(page.getByText('¥ 100.00')).toHaveCount(0);
  await expect(page.getByTestId('admin-page-skeleton')).toBeHidden();
  await expect(page.getByText('¥ 100.00').first()).toBeVisible();
});

test('商品分类加载失败显示可重试错误态', async ({ page }) => {
  const permissions = ['page.product-categories', 'menu.product-categories'];
  await auth(page, permissions);
  let attempts = 0;
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/product-categories')) {
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 500, json: { message: 'failed' } });
      return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('/product-categories');
  await expect(page.getByTestId('admin-load-error')).toBeVisible();
  await expect(page.getByText('暂无商品分类')).toHaveCount(0);
  await page.getByRole('button', { name: '重新加载' }).click();
  await expect(page.getByText('箱包', { exact: true })).toBeVisible();
});

test('库存模块切换时统一显示骨架且不闪烁空态', async ({ page }) => {
  const permissions = [
    'group.inventory',
    'menu.inventory.stocks', 'page.inventory.stocks',
    'menu.inventory.counts', 'page.inventory.counts',
    'menu.inventory.transfers', 'page.inventory.transfers',
    'menu.inventory.warehouses', 'page.inventory.warehouses',
  ];
  await auth(page, permissions);
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.pathname.endsWith('/inventory/warehouse-options')) return route.fulfill({ json: { data: [] } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { billing: { limits: { warehouses: 3 } } } } });
    if (url.pathname.endsWith('/inventory/stocks')) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 10, summary: { onHand: 12, available: 9, inTransit: 3, warningItems: 0, warehouses: [], warningEnabled: true, warningThreshold: 10 } } } });
    }
    if (/\/inventory\/(counts|transfers|warehouses)$/.test(url.pathname)) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 10 } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('/inventory/stocks');
  const skeleton = page.getByTestId('admin-page-skeleton');
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveAttribute('aria-label', '库存页面加载中');
  await expect(page.getByText('暂无库存')).toHaveCount(0);
  await expect(skeleton).toBeHidden();
  await expect(page.getByText('12', { exact: true })).toBeVisible();

  for (const item of [
    { name: '库存盘点', empty: '暂无盘点单' },
    { name: '库存调拨', empty: '暂无调拨单' },
    { name: '仓库管理', empty: '暂无仓库' },
  ]) {
    await page.getByRole('button', { name: item.name, exact: true }).click();
    await expect(skeleton).toBeVisible();
    await expect(page.getByText(item.empty)).toHaveCount(0);
    await expect(skeleton).toBeHidden();
    await expect(page.getByText(item.empty)).toBeVisible();
  }
});

const systemAdminAuth = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'system_admin', account: 'admin' }));
  });
};

const tenant = (index: number) => ({
  id: `tenant-${index}`,
  name: `租户 ${index}`,
  slug: `tenant-${index}`,
  adminAccount: `1380000${String(index).padStart(4, '0')}`,
  status: 'active',
  plan: 'standard',
  maxProducts: 50,
  maxMembers: 5,
  maxWarehouses: 3,
  expiresAt: null,
  permissions: [],
  permissionMode: 'plan',
  quotaMode: 'plan',
  usage: { products: 1, customers: 1, users: 1, sites: 1, warehouses: 1 },
  defaultQuota: { maxProducts: 50, maxMembers: 5, maxWarehouses: 3 },
});

test('系统管理菜单切换立即显示对应骨架且迟到请求不覆盖当前页', async ({ page }) => {
  await systemAdminAuth(page);
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { role: 'system_admin', permissions: [] } } });
    if (url.pathname.endsWith('/system/analytics')) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return route.fulfill({ json: { data: { lifecycle: { total: 7 }, tenantGrowth: [], planDistribution: [], topTenants: [] } } });
    }
    if (url.pathname.endsWith('/system/tenants')) {
      await new Promise(resolve => setTimeout(resolve, 900));
      return route.fulfill({ json: { data: { items: [tenant(1)], total: 1, page: 1, pageSize: 10, summary: { maxProducts: 50, maxMembers: 5, maxWarehouses: 3 } } } });
    }
    if (url.pathname.endsWith('/system/plans')) {
      await new Promise(resolve => setTimeout(resolve, 250));
      return route.fulfill({ json: { data: [{ id: 'plan-1', code: 'standard', name: '竞态测试套餐', price: 100, currency: 'CNY', billingCycle: 'month', description: '测试', maxProducts: 50, maxMembers: 5, maxWarehouses: 3, permissions: [], enabled: true, sortOrder: 1 }] } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('/system/overview');
  const skeleton = page.getByTestId('admin-page-skeleton');
  await expect(skeleton).toBeVisible();
  await expect(page.getByText('0', { exact: true })).toHaveCount(0);
  await expect(skeleton).toBeHidden();
  await expect(page.getByText('租户运营', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '租户档案', exact: true }).click();
  await expect(skeleton).toBeVisible();
  await expect(page.getByText('暂无租户')).toHaveCount(0);
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: '套餐管理', exact: true }).click();
  await expect(skeleton).toBeVisible();
  await expect(page.getByText('暂无套餐')).toHaveCount(0);
  await expect(page.getByText('竞态测试套餐', { exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByText('竞态测试套餐', { exact: true })).toBeVisible();
  await expect(page.getByText('租户 1', { exact: true })).toHaveCount(0);
});

test('系统管理切换菜单重置页码并保留每页条数', async ({ page }) => {
  await systemAdminAuth(page);
  const queries: Array<{ module: string; page: number; pageSize: number }> = [];
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { role: 'system_admin', permissions: [] } } });
    if (url.pathname.endsWith('/system/tenants')) {
      const pageNumber = Number(url.searchParams.get('page'));
      const pageSize = Number(url.searchParams.get('pageSize'));
      queries.push({ module: page.url().split('/').pop() || '', page: pageNumber, pageSize });
      const start = (pageNumber - 1) * pageSize;
      return route.fulfill({ json: { data: { items: Array.from({ length: Math.min(pageSize, 45 - start) }, (_, index) => tenant(start + index + 1)), total: 45, page: pageNumber, pageSize, summary: { maxProducts: 2250, maxMembers: 225, maxWarehouses: 135 } } } });
    }
    return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 10 } } });
  });

  await page.goto('/system/merchants');
  await expect(page.getByText('租户 1', { exact: true })).toBeVisible();
  await page.locator('.ant-pagination-options .ant-select-selector').click();
  await page.locator('.ant-select-item-option:visible').filter({ hasText: '20' }).click();
  await expect.poll(() => queries.some(query => query.module === 'merchants' && query.page === 1 && query.pageSize === 20)).toBe(true);
  await page.locator('.ant-pagination-item-2').click();
  await expect.poll(() => queries.some(query => query.module === 'merchants' && query.page === 2 && query.pageSize === 20)).toBe(true);

  await page.getByRole('button', { name: '配额与权限', exact: true }).click();
  await expect.poll(() => queries.some(query => query.module === 'quotas' && query.page === 1 && query.pageSize === 20)).toBe(true);
  await expect(page.getByText('租户 1', { exact: true })).toBeVisible();

  await page.goBack();
  await expect.poll(() => queries.filter(query => query.module === 'merchants').at(-1)).toMatchObject({ page: 1, pageSize: 20 });
  await expect(page.getByText('租户 1', { exact: true })).toBeVisible();
});
