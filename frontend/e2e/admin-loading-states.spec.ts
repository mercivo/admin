import { expect, test } from '@playwright/test';

const auth = async (page: import('@playwright/test').Page, permissions: string[]) => {
  await page.addInitScript(({ permissions }) => {
    localStorage.setItem('mercivo_access_token', 'loading-state-e2e');
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
