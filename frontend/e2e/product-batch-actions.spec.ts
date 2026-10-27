import { expect, test, type Page, type Route } from '@playwright/test';

const pendingProduct = { id: '11111111-1111-4111-8111-111111111111', nameZh: '未同步商品', sku: 'PENDING-001', basePrice: 10, stock: 3, moq: 1, status: 'pending', category: 'bags', img: '', images: [], hot: false, badge: '', likeCount: 0, tags: [], variants: [], levelPrices: {}, currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } } };
const publishedProduct = { ...pendingProduct, id: '22222222-2222-4222-8222-222222222222', nameZh: '已同步商品', sku: 'PUBLISHED-001', status: 'published' };

const prepareProducts = async (page: Page) => {
  const batchRequests: Array<{ ids: string[]; status: string }> = [];
  const exportQueries: URLSearchParams[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.publish', 'product.create', 'product.edit'] }));
  });
  await page.route('**/api/v1/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.products', 'product.publish', 'product.create', 'product.edit'] } } });
    if (url.pathname.endsWith('/product/batch-status')) {
      batchRequests.push(request.postDataJSON());
      return route.fulfill({ json: { data: { updated: request.postDataJSON().ids.length, status: request.postDataJSON().status } } });
    }
    if (url.pathname.endsWith('/product/export')) {
      exportQueries.push(url.searchParams);
      return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'xlsx' });
    }
    if (url.pathname.endsWith('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (url.pathname.endsWith('/product')) return route.fulfill({ json: { data: { items: [pendingProduct, publishedProduct], total: 2, page: 1, pageSize: 10, summary: { categoryCounts: { bags: 2 }, totalProducts: 2 } } } });
    if (url.pathname.endsWith('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', symbol: '¥', name: '人民币', enabled: true }] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { billing: { limits: { products: 100 } } } } });
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('/products');
  await expect(page.getByText('未同步商品', { exact: true })).toBeVisible();
  return { batchRequests, exportQueries };
};

const selectRow = async (page: Page, id: string) => {
  await page.locator(`tr[data-row-key="${id}"] .ant-checkbox-input`).evaluate((element: HTMLInputElement) => element.click());
};

test('batch sync and cancel enforce product status before submitting', async ({ page }) => {
  const { batchRequests } = await prepareProducts(page);
  await selectRow(page, pendingProduct.id);
  await page.getByRole('button', { name: '同步', exact: true }).click();
  await page.getByRole('dialog', { name: '批量同步' }).getByRole('button', { name: '确认同步' }).click();
  await expect.poll(() => batchRequests).toHaveLength(1);
  expect(batchRequests[0]).toEqual({ ids: [pendingProduct.id], status: 'published' });

  await selectRow(page, publishedProduct.id);
  await page.getByRole('button', { name: '同步', exact: true }).click();
  await expect(page.getByText('请选择还未同步的商品数据', { exact: true })).toBeVisible();
  expect(batchRequests).toHaveLength(1);

  await page.getByRole('button', { name: '取消同步', exact: true }).click();
  await page.getByRole('dialog', { name: '批量取消同步' }).getByRole('button', { name: '确认取消同步' }).click();
  await expect.poll(() => batchRequests).toHaveLength(2);
  expect(batchRequests[1]).toEqual({ ids: [publishedProduct.id], status: 'pending' });
});

test('mixed selections are rejected and export uses the complete current query without selection', async ({ page }) => {
  const { batchRequests, exportQueries } = await prepareProducts(page);
  await expect(page.getByRole('button', { name: '导出', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入', exact: true })).toHaveCount(0);
  await selectRow(page, pendingProduct.id);
  await selectRow(page, publishedProduct.id);
  await page.getByRole('button', { name: '取消同步', exact: true }).click();
  await expect(page.getByText('请选择已同步的商品数据', { exact: true })).toBeVisible();
  expect(batchRequests).toHaveLength(0);

  await page.getByPlaceholder('搜索商品名称或商品编码...').fill('测试关键词');
  await page.getByText('箱包', { exact: true }).first().click();
  await page.locator('.ant-select').filter({ hasText: '全部状态' }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: '已同步' }).click();
  await page.getByRole('button', { name: '导出', exact: true }).click();
  await expect.poll(() => exportQueries).toHaveLength(1);
  expect(exportQueries[0].get('keyword')).toBe('测试关键词');
  expect(exportQueries[0].get('category')).toBe('bags');
  expect(exportQueries[0].get('status')).toBe('published');
  expect(exportQueries[0].get('currency')).toBe('CNY');
  expect(exportQueries[0].has('page')).toBe(false);
  expect(exportQueries[0].has('pageSize')).toBe(false);
});
