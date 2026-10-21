import { expect, test } from '@playwright/test';

const permissions = [
  'group.purchase',
  'menu.purchase.suppliers',
  'page.purchase.suppliers',
  'purchase.supplier.create',
  'purchase.supplier.edit',
];
const supplier = {
  id: 'supplier-1', code: 'SUP-INTERNAL', name: '华东供应商', contact: '张三',
  phone: '13800000000', email: 'supplier@example.com', address: '上海市浦东新区',
  taxNo: '', paymentTerms: '', paymentDays: 0, status: 'active', remark: '核心供应商',
  createdAt: '2026-10-13T00:00:00.000Z',
};

test('supplier management hides internal and removed fields and aligns placeholders with labels', async ({ page }) => {
  await page.addInitScript(({ permissions }) => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions }));
  }, { permissions });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/purchase/suppliers')) return route.fulfill({ json: { data: { items: [supplier], total: 1, page: 1, pageSize: 10 } } });
    if (url.includes('/workspace/config/sales')) return route.fulfill({ json: { data: {} } });
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto('http://localhost:8088/purchase/suppliers');
  await expect(page.getByRole('heading', { name: '供应商管理' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: '供应商编码' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: '结算条件' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: '账期' })).toHaveCount(0);
  for (const heading of ['供应商名称', '联系人', '联系电话', '邮箱', '地址', '状态', '备注']) {
    await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
  }
  for (const value of ['华东供应商', '张三', '13800000000', 'supplier@example.com', '上海市浦东新区', '核心供应商']) {
    await expect(page.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(page.getByTitle('查看')).toHaveCount(0);

  await page.getByRole('button', { name: '新建供应商' }).click();
  const modal = page.getByRole('dialog', { name: '新建供应商' });
  for (const label of ['供应商名称', '联系人', '联系电话', '邮箱', '状态', '地址', '备注']) {
    await expect(modal.locator('.app-modal-form-label').filter({ hasText: label })).toBeVisible();
  }
  for (const placeholder of ['供应商名称', '联系人', '联系电话', '邮箱', '地址', '备注']) {
    await expect(modal.getByPlaceholder(placeholder)).toBeVisible();
  }
  for (const removed of ['供应商编码', '纳税识别号', '结算条件', '账期（天）']) {
    await expect(modal.getByText(removed, { exact: true })).toHaveCount(0);
  }
});
