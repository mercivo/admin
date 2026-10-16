import { expect, test } from '@playwright/test';

const permissions = [
  'page.inventory.stocks', 'page.inventory.counts', 'menu.inventory.stocks',
  'menu.inventory.counts', 'group.inventory', 'inventory.ledger.view',
  'inventory.count.create', 'inventory.count.complete',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ permissions }) => {
    localStorage.setItem('mercivo_access_token', 'inventory-ui-test-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', account: 'inventory-ui-test' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions }));
  }, { permissions });
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { permissions } });
    if (url.includes('/inventory/ledger')) return route.fulfill({ json: { items: [{
      id: 'ledger-1', warehouseId: 'wh-1', warehouseName: '上海仓', productId: 'product-1',
      productName: '测试商品', productSku: 'SKU-001', variantKey: 'v-red', variantLabel: '颜色: 红',
      type: 'purchase_in', quantityChange: 5, balanceAfter: 13, referenceType: 'purchase_receipt',
      referenceId: 'receipt-1', referenceNo: 'RK202610130001', actorUserId: 'user-1', remark: '采购入库',
      createdAt: '2026-10-13T00:00:00Z',
    }], total: 1, page: 1, pageSize: 10, summary: { inbound: 5, outbound: 0 } } });
    if (url.includes('/inventory/stocks')) return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 10, summary: { onHand: 0, available: 0, inTransit: 0, warningItems: 0, warehouses: [], warningEnabled: true, warningThreshold: 10 } } });
    if (url.includes('/inventory/counts')) return route.fulfill({ json: { items: [{ id: 'count-1', documentNo: 'PD001', warehouseId: 'wh-1', warehouseName: '上海仓', status: 'counting', remark: '', createdAt: '2026-10-13T00:00:00Z', lines: [{ id: 'line-1', productId: 'product-1', productName: '测试商品', productSku: 'SKU-001', variantKey: 'v-red', variantLabel: '颜色: 红', systemQuantity: 8, countedQuantity: null, difference: 0 }] }], total: 1, page: 1, pageSize: 10 } });
    if (url.includes('/inventory/warehouse-options') || url.includes('/inventory/stock-options')) return route.fulfill({ json: [] });
    return route.fulfill({ json: {} });
  });
});

test('ledger opens without an API error and count lines show product details', async ({ page }) => {
  const failedResponses: string[] = [];
  const ledgerRequests: URL[] = [];
  page.on('request', request => {
    if (request.url().includes('/inventory/ledger')) ledgerRequests.push(new URL(request.url()));
  });
  page.on('response', response => {
    if (response.url().includes('/inventory/ledger') && response.status() >= 400) failedResponses.push(`${response.status()}`);
  });
  await page.goto(`${process.env.ADMIN_BASE_URL || 'http://localhost:8088'}/inventory/stocks`);
  await page.getByRole('button', { name: '库存流水' }).click();
  await expect(page.getByText('库存流水 · 全部明细')).toBeVisible();
  const ledgerModal = page.locator('.inventory-ledger-modal');
  await expect(ledgerModal.getByText('采购入库', { exact: true }).last()).toBeVisible();
  await expect(ledgerModal.getByText('RK202610130001', { exact: true })).toBeVisible();
  await ledgerModal.locator('.ant-select').filter({ hasText: '全部业务类型' }).click();
  for (const type of ['期初库存', '盘点调整', '调拨出库', '调拨入库', '采购入库', '销售出库']) {
    await expect(page.locator('.ant-select-item-option').filter({ hasText: type })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  expect(failedResponses).toEqual([]);
  expect(ledgerRequests).toHaveLength(1);
  expect(ledgerRequests[0].searchParams.has('startDate')).toBe(false);
  expect(ledgerRequests[0].searchParams.has('endDate')).toBe(false);

  await page.goto(`${process.env.ADMIN_BASE_URL || 'http://localhost:8088'}/inventory/counts`);
  await page.getByTitle('继续盘点').click();
  const modal = page.locator('.app-modal').filter({ hasText: '盘点录入 · PD001' });
  await expect(modal.getByText('测试商品', { exact: true })).toBeVisible();
  await expect(modal.getByText('SKU-001 · 颜色: 红', { exact: true })).toBeVisible();
  await expect(modal.getByText('product-1', { exact: true })).toHaveCount(0);
});
