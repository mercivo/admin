import { expect, test } from '@playwright/test';

const order = {
  id: 'order-1',
  orderNo: 'SO-20261013-001',
  customerId: 'customer-1',
  customerName: '示例客户',
  customerCompany: '示例公司',
  warehouseId: 'warehouse-1',
  warehouseName: '上海仓',
  currency: 'CNY',
  amount: 200,
  discount: 0,
  shippingFee: 0,
  totalAmount: 200,
  status: 'confirmed',
  paymentStatus: 'unpaid',
  deliveryDate: null,
  shippingAddress: '',
  contactName: '',
  contactPhone: '',
  remark: '',
  createdAt: '2026-10-13T00:00:00.000Z',
  lines: [{
    id: 'line-1', orderLineId: 'line-1', productId: 'product-1', variantKey: 'BASE',
    productName: '示例商品', productSku: 'SKU-001', variantLabel: '', quantity: 2,
    shippedQuantity: 0, unitPrice: 100, amount: 200,
  }],
};
const shipment = {
  id: 'shipment-1', shipmentNo: 'OUT-20261013-001', orderId: order.id, orderNo: order.orderNo,
  customerName: order.customerName, warehouseId: order.warehouseId, warehouseName: order.warehouseName,
  status: 'shipped', deliveryMethod: 'logistics', logisticsCompany: '顺丰速运', trackingNo: 'SF001',
  remark: '', shippedAt: '2026-10-13T01:00:00.000Z', createdAt: '2026-10-13T01:00:00.000Z',
  lines: [{ ...order.lines[0], quantity: 1 }],
};
const cancelledOrder = { ...order, id: 'order-2', orderNo: 'SO-20261013-002', status: 'cancelled' };
const productOptions = Array.from({ length: 200 }, (_, index) => ({
  id: `product-${index + 1}`,
  nameZh: `批量商品 ${String(index + 1).padStart(3, '0')}`,
  sku: `SKU-${String(index + 1).padStart(3, '0')}`,
  basePrice: index + 1,
  variants: [],
}));

test.beforeEach(async ({ page }) => {
  const permissions = [
    'page.sales.orders', 'page.sales.shipments', 'menu.sales.orders', 'menu.sales.shipments',
    'group.sales', 'sales.order.create', 'sales.order.cancel', 'sales.shipment.create',
  ];
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', account: 'sales-ui-test' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({
      permissions: [
        'page.sales.orders', 'page.sales.shipments', 'menu.sales.orders', 'menu.sales.shipments',
        'group.sales', 'sales.order.create', 'sales.order.cancel', 'sales.shipment.create',
      ],
    }));
  });
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({ json: { permissions } });
      return;
    }
    if (url.includes('/sales/orders')) {
      await route.fulfill({ json: { items: [order, cancelledOrder], total: 2, page: 1, pageSize: 20 } });
      return;
    }
    if (url.includes('/sales/shipments')) {
      await route.fulfill({ json: { items: [shipment], total: 1, page: 1, pageSize: 20 } });
      return;
    }
    if (url.includes('/customers/options/all')) {
      await route.fulfill({ json: [{ id: 'customer-1', name: '示例客户', phone: '13800000000', status: 'active' }] });
      return;
    }
    if (url.includes('/inventory/warehouse-options')) {
      await route.fulfill({ json: [
        { id: 'warehouse-1', name: '上海仓', status: 'active', isLocked: false, activeCountDocumentNo: null },
        { id: 'warehouse-2', name: '北京仓', status: 'active', isLocked: true, activeCountDocumentNo: 'PD202610130001' },
      ] });
      return;
    }
    if (url.includes('/product/options/all')) {
      await route.fulfill({ json: productOptions });
      return;
    }
    if (url.includes('/inventory/stock-options')) {
      await route.fulfill({ json: productOptions.map(product => ({
        warehouseId: 'warehouse-1', productId: product.id, variantKey: 'BASE', available: 999,
      })) });
      return;
    }
    await route.fulfill({ json: {} });
  });
});

test('sales confirmation and workflow modals use the shared visual structure', async ({ page }) => {
  await page.goto(`${process.env.ADMIN_BASE_URL || 'http://localhost:8088'}/sales/orders`);
  await expect(page.getByRole('heading', { name: '销售订单' })).toBeVisible();

  await page.getByTitle('取消订单').click();
  const confirmModal = page.locator('.app-modal.app-confirm-modal').filter({ hasText: '取消销售订单' });
  await expect(confirmModal).toBeVisible();
  await expect(confirmModal.getByText('SO-20261013-001')).toBeVisible();
  await expect(confirmModal.locator('.app-confirm-message')).toHaveCSS('text-align', 'center');
  await expect(confirmModal.getByRole('button', { name: '确认取消' })).toBeVisible();
  await expect(confirmModal.getByRole('button', { name: '暂不操作' })).toBeVisible();
  await confirmModal.getByRole('button', { name: '暂不操作' }).click();

  await page.getByTitle('删除订单').click();
  const deleteModal = page.locator('.app-modal.app-confirm-modal').filter({ hasText: '删除销售订单' });
  await expect(deleteModal.getByText('SO-20261013-002')).toBeVisible();
  await expect(deleteModal.getByRole('button', { name: '确认删除' })).toBeVisible();
  await deleteModal.getByRole('button', { name: '暂不操作' }).click();

  await page.getByTitle('重新编辑').click();
  const reopenModal = page.locator('.sales-workflow-modal').filter({ hasText: '重新编辑销售订单' });
  await expect(reopenModal).toBeVisible();
  const productSelect = reopenModal.locator('.sales-order-lines-table .ant-select-selector');
  await productSelect.click();
  await expect(page.locator('.product-spec-dropdown')).toBeVisible();
  await expect(page.locator('.product-spec-dropdown .rc-virtual-list-holder')).toBeVisible();
  await page.locator('.ant-select-selection-search-input').last().fill('批量商品 150');
  await page.getByText('批量商品 150 (SKU-150)', { exact: true }).click();
  await expect(reopenModal.locator('.sales-order-lines-table .ant-select-selection-item')).toContainText('批量商品 150');
  await reopenModal.locator('button.ant-modal-close').click();

  await page.getByTitle('查看').first().click();
  const detailModal = page.locator('.app-modal').filter({ hasText: '销售订单 · SO-20261013-001' });
  await expect(detailModal.locator('.ant-descriptions')).toBeVisible();
  await expect(detailModal.locator('.ant-table')).toBeVisible();
  await expect(detailModal.locator('.ant-table-body')).toHaveCount(0);
  await expect(detailModal.locator('.ant-table-title').getByText('商品明细')).toBeVisible();
  expect(await detailModal.getByText('示例商品', { exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await detailModal.locator('.ant-descriptions-header').evaluate(element => {
    const style = getComputedStyle(element);
    return [style.marginBottom, style.marginLeft, style.marginRight, style.paddingLeft, style.paddingRight];
  })).toEqual(['6px', '0px', '0px', '0px', '0px']);
  expect(await detailModal.locator('.ant-table-title').evaluate(element => {
    const style = getComputedStyle(element);
    return [style.paddingBottom, style.paddingLeft, style.paddingRight, style.marginLeft, style.marginRight];
  })).toEqual(['6px', '0px', '0px', '0px', '0px']);
  await expect(detailModal.locator('.app-data-table')).toHaveCount(0);
  await detailModal.locator('button.ant-modal-close').click();

  await page.getByRole('button', { name: '新建销售订单' }).click();
  const orderModal = page.locator('.sales-workflow-modal').filter({ hasText: '新建销售订单' });
  await expect(orderModal.locator('.sales-form-section')).toHaveCount(0);
  await expect(orderModal.getByText('*客户', { exact: true })).toBeVisible();
  await expect(orderModal.getByText('*商品明细', { exact: true })).toBeVisible();
  await expect(orderModal.getByPlaceholder('请输入详细收货地址')).toBeVisible();
  const warehouseField = orderModal.locator('.app-modal-form-field').filter({ hasText: '出库仓库' });
  await warehouseField.getByRole('combobox').click();
  const lockedWarehouseOption = page.locator('.ant-select-item-option').filter({ hasText: '北京仓' });
  await expect(lockedWarehouseOption).toBeVisible();
  await expect(lockedWarehouseOption).toHaveClass(/ant-select-item-option-disabled/);
  await expect(lockedWarehouseOption.getByText('盘点中', { exact: true })).toBeVisible();
  await expect(lockedWarehouseOption.locator('svg.lucide-lock-keyhole')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await orderModal.locator('.sales-order-lines-table tbody td').first().evaluate(element => getComputedStyle(element).verticalAlign)).toBe('middle');
  expect(await orderModal.locator('.sales-order-lines-table .ant-select-selector').evaluate(element => getComputedStyle(element).alignItems)).toBe('center');
  await orderModal.locator('button.ant-modal-close').click();

  await page.getByTitle('销售出库').click();
  const shipmentModal = page.locator('.sales-workflow-modal').filter({ hasText: '销售出库 · SO-20261013-001' });
  await expect(shipmentModal.locator('.ant-descriptions')).toBeVisible();
  await expect(shipmentModal.locator('.sales-form-section')).toHaveCount(0);
  await expect(shipmentModal.locator('.sales-content-title').getByText('本次出库明细')).toBeVisible();
  expect(await shipmentModal.locator('.sales-content-block').evaluate(element => getComputedStyle(element).gap)).toBe('6px');
  await expect(shipmentModal.getByText('本次出库明细', { exact: true })).toBeVisible();
  expect(await shipmentModal.getByText('示例商品', { exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  await expect(shipmentModal.getByText('*出库方式', { exact: true })).toBeVisible();
  const titleStyle = await shipmentModal.locator('.sales-content-title').evaluate(element => {
    const style = getComputedStyle(element);
    return [style.color, style.fontSize, style.fontWeight, style.letterSpacing, style.lineHeight];
  });
  const labelStyle = await shipmentModal.locator('.app-modal-form-label').filter({ hasText: '出库方式' }).evaluate(element => {
    const style = getComputedStyle(element);
    return [style.color, style.fontSize, style.fontWeight, style.letterSpacing, style.lineHeight];
  });
  expect(titleStyle).toEqual(labelStyle);
  await shipmentModal.locator('.ant-select-selector').click();
  await expect(page.getByText('线下自取', { exact: true }).last()).toBeVisible();
  await page.getByText('物流发货', { exact: true }).last().click();
  await expect(shipmentModal.getByPlaceholder('请输入物流公司')).toBeVisible();
  await expect(shipmentModal.getByPlaceholder('请输入物流单号')).toBeVisible();
  await shipmentModal.locator('button.ant-modal-close').click();

  await page.goto(`${process.env.ADMIN_BASE_URL || 'http://localhost:8088'}/sales/shipments`);
  await page.getByTitle('查看出库明细').click();
  const shipmentDetail = page.locator('.app-modal').filter({ hasText: '销售出库 · OUT-20261013-001' });
  await expect(shipmentDetail.getByText('出库信息', { exact: true })).toBeVisible();
  await expect(shipmentDetail.locator('.ant-descriptions')).toBeVisible();
  await expect(shipmentDetail.locator('.ant-table')).toBeVisible();
  await expect(shipmentDetail.locator('.ant-table-title').getByText('商品明细')).toBeVisible();
  expect(await shipmentDetail.getByText('示例商品', { exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await shipmentDetail.locator('.ant-descriptions-header').evaluate(element => getComputedStyle(element).marginBottom)).toBe('6px');
  expect(await shipmentDetail.locator('.ant-table-title').evaluate(element => getComputedStyle(element).paddingBottom)).toBe('6px');
});
