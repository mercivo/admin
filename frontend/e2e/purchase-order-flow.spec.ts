import { expect, test } from '@playwright/test';

const permissions = [
  'group.purchase', 'menu.purchase.orders', 'page.purchase.orders',
  'purchase.order.create', 'purchase.order.confirm', 'purchase.order.cancel',
  'purchase.receipt.create',
];
const supplier = {
  id: 'supplier-1', code: 'SUP-INTERNAL-001', name: '华东供应商', status: 'active',
  contact: '', phone: '', email: '', address: '', taxNo: '', paymentTerms: '', paymentDays: 0,
  remark: '', createdAt: '2026-10-13T00:00:00.000Z',
};
const order = {
  id: 'order-1', orderNo: 'PO202610130001', supplierId: supplier.id, supplierName: supplier.name,
  warehouseId: 'warehouse-1', warehouseName: '上海仓', currency: 'CNY', amount: 100,
  taxAmount: 0, shippingFee: 0, totalAmount: 100, status: 'confirmed', expectedDate: null,
  remark: '', createdAt: '2026-10-13T00:00:00.000Z', confirmedAt: '2026-10-13T00:00:00.000Z',
  lines: [{ id: 'line-1', productId: 'product-1', variantKey: 'BASE', productName: '测试商品', productSku: 'SKU-1', variantLabel: '默认规格', quantity: 1, receivedQuantity: 0, unitPrice: 100, amount: 100 }],
};

test('purchase order creation matches the simplified sales-order flow', async ({ page }) => {
  await page.addInitScript(({ permissions }) => {
    localStorage.setItem('mercivo_access_token', 'purchase-order-ui-test-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions }));
  }, { permissions });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/purchase/supplier-options')) return route.fulfill({ json: { data: [supplier] } });
    if (url.includes('/purchase/orders')) return route.fulfill({ json: { data: { items: [order], total: 1, page: 1, pageSize: 10, summary: { amount: 100, pendingReceipt: 1 } } } });
    if (url.includes('/inventory/warehouse-options')) return route.fulfill({ json: { data: [
      { id: 'warehouse-1', name: '上海仓', status: 'active', isLocked: false, activeCountDocumentNo: null },
      { id: 'warehouse-2', name: '北京仓', status: 'active', isLocked: true, activeCountDocumentNo: 'PD202610130001' },
    ] } });
    if (url.includes('/product/options/all')) return route.fulfill({ json: { data: [{ id: 'product-1', nameZh: '测试商品', sku: 'SKU-1', basePrice: 100, variants: [] }] } });
    if (url.includes('/workspace/config/currency')) return route.fulfill({ json: { data: {} } });
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto('http://localhost:8088/purchase/orders');
  await expect(page.getByTitle('编辑')).toHaveCount(0);
  await expect(page.getByTitle('确认订单')).toHaveCount(0);

  await page.getByTitle('查看').click();
  const detailModal = page.getByRole('dialog', { name: `采购订单 · ${order.orderNo}` });
  await expect(detailModal.getByText('订单信息', { exact: true })).toBeVisible();
  await expect(detailModal.locator('.ant-descriptions')).toBeVisible();
  await expect(detailModal.locator('.ant-table-title').getByText('商品明细')).toBeVisible();
  await expect(detailModal.getByText('供应商', { exact: true })).toBeVisible();
  await expect(detailModal.getByText('入库仓库', { exact: true })).toBeVisible();
  await expect(detailModal.getByText('supplierName', { exact: true })).toHaveCount(0);
  await detailModal.getByLabel('Close').click();

  await page.getByTitle('采购入库').click();
  const receiptModal = page.getByRole('dialog', { name: `采购入库 · ${order.orderNo}` });
  await expect(receiptModal.getByText('核对待入库商品与入库仓库，提交后将增加现存库存')).toBeVisible();
  await expect(receiptModal.locator('.ant-descriptions')).toBeVisible();
  await expect(receiptModal.getByText('本次入库明细', { exact: true })).toBeVisible();
  await expect(receiptModal.getByRole('columnheader', { name: '订购' })).toBeVisible();
  await expect(receiptModal.getByRole('columnheader', { name: '已入库' })).toBeVisible();
  await receiptModal.getByLabel('Close').click();

  await page.getByRole('button', { name: '新建采购订单' }).click();

  const modal = page.getByRole('dialog', { name: '新建采购订单' });
  await expect(modal.getByText('填写订单与到货信息，提交后商品数量将自动计入在途库存')).toBeVisible();
  await expect(modal.getByRole('button', { name: '创建并计入在途库存' })).toBeVisible();
  await modal.getByRole('combobox').first().click();
  await expect(page.getByText('华东供应商', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('SUP-INTERNAL-001', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const warehouseField = modal.locator('.app-modal-form-field').filter({ hasText: '入库仓库' });
  await warehouseField.getByRole('combobox').click();
  const lockedWarehouseOption = page.locator('.ant-select-item-option').filter({ hasText: '北京仓' });
  await expect(lockedWarehouseOption).toBeVisible();
  await expect(lockedWarehouseOption).toHaveClass(/ant-select-item-option-disabled/);
  await expect(lockedWarehouseOption.getByText('盘点中', { exact: true })).toBeVisible();
  await expect(lockedWarehouseOption.locator('svg.lucide-lock-keyhole')).toBeVisible();
  expect(await modal.locator('.purchase-order-lines-table tbody td').first().evaluate(element => getComputedStyle(element).verticalAlign)).toBe('middle');
  expect(parseFloat(await modal.locator('.purchase-order-lines-table tbody td').first().evaluate(element => getComputedStyle(element).height))).toBeGreaterThanOrEqual(56);
  expect(await modal.locator('.purchase-order-lines-table .ant-select-selector').evaluate(element => getComputedStyle(element).alignItems)).toBe('center');

  for (const label of ['税额', '运费']) {
    const field = modal.locator('.app-modal-form-field').filter({ hasText: label });
    const input = field.locator('.ant-input-number');
    const [fieldBox, inputBox] = await Promise.all([field.boundingBox(), input.boundingBox()]);
    expect(Math.abs((fieldBox?.width || 0) - (inputBox?.width || 0))).toBeLessThanOrEqual(1);
  }
  await expect(modal.getByText('保存草稿', { exact: true })).toHaveCount(0);
});
