import { expect, test, type Page } from '@playwright/test';

const product = {
  id: 'product-1',
  nameZh: '重复商品名称',
  description: '',
  sku: 'SKU-001',
  price: '10.00',
  basePrice: 10,
  stock: 0,
  moq: 1,
  status: 'pending',
  category: 'bags',
  img: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="600"%3E%3Crect width="100" height="600" fill="%237c6ef5"/%3E%3C/svg%3E',
  images: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="600"%3E%3Crect width="100" height="600" fill="%237c6ef5"/%3E%3C/svg%3E'],
  hot: false,
  badge: 'recommended',
  likeCount: 0,
  tags: ['这是一个非常非常长的商品标签用于验证省略号', '第二个同样很长的商品标签用于验证布局'],
  variants: [],
  levelPrices: {},
  currencyPrices: { CNY: { basePrice: 10, levelPrices: {} } },
};

const prepareMerchant = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', account: '13800000000' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.create', 'product.edit'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '这是一个非常非常长的商品分类名称用于验证省略号', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (/\/product\/product-1(?:\?|$)/.test(url)) return route.fulfill({ json: { data: product } });
    if (url.includes('/product')) return route.fulfill({ json: { data: { items: [product], total: 1, page: 1, pageSize: 10, summary: { categoryCounts: { bags: 1 }, totalProducts: 1 } } } });
    if (url.includes('/customers/pricing-policy')) return route.fulfill({ json: { data: { mode: 'base' } } });
    if (url.includes('/customers/levels')) return route.fulfill({ json: { data: [] } });
    if (url.includes('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY' } } });
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: { site: { defaultCurrency: 'CNY' }, billing: { usage: { products: 1 }, limits: { products: 100 } } } } });
    return route.fulfill({ json: { data: {} } });
  });
};

test('product list renders an identical Chinese and English name only once', async ({ page }) => {
  await prepareMerchant(page);
  await page.goto('http://localhost:8088/products');
  await expect(page.getByText('重复商品名称', { exact: true })).toHaveCount(1);
  const productColumn = page.getByRole('columnheader', { name: '商品', exact: true });
  await expect(productColumn).toBeVisible();
  expect((await productColumn.boundingBox())?.width).toBeLessThanOrEqual(320);
  for (const text of ['这是一个非常非常长的商品分类名称用于验证省略号', '推荐', '这是一个非常非常长的商品标签用于验证省略号']) {
    const chip = page.getByRole('table').getByTitle(text);
    await expect(chip).toHaveCSS('text-overflow', 'ellipsis');
    expect((await chip.boundingBox())!.width).toBeLessThanOrEqual(80);
    await expect(chip).toHaveCSS('text-align', 'center');
  }
  expect((await page.getByRole('table').getByTitle('推荐').boundingBox())!.width).toBeLessThan(48);
  expect((await page.getByRole('table').getByTitle('这是一个非常非常长的商品分类名称用于验证省略号').boundingBox())!.width).toBeLessThanOrEqual(78);
  expect((await page.getByRole('table').getByTitle('这是一个非常非常长的商品标签用于验证省略号').boundingBox())!.width).toBeLessThanOrEqual(58);
  const price = page.getByText('¥ 10.00', { exact: true });
  await expect(price).toBeVisible();
  expect(await price.evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
});

test('product create and edit pages do not render the inventory reminder card', async ({ page }) => {
  await prepareMerchant(page);
  await page.goto('http://localhost:8088/products/new');
  await expect(page.getByText('库存提醒', { exact: true })).toHaveCount(0);
  await page.goto('http://localhost:8088/products/product-1/edit');
  await expect(page.getByText('库存提醒', { exact: true })).toHaveCount(0);
});

test('delete variant confirmation centers its icon above the copy', async ({ page }) => {
  await prepareMerchant(page);
  await page.goto('/products/product-1/edit');
  await page.getByRole('button', { name: '规格库存', exact: true }).click();
  await page.getByRole('button', { name: '添加规格行' }).click();
  await page.getByTitle('删除规格').click();

  const dialog = page.getByRole('dialog', { name: '删除规格' });
  await expect(dialog).toBeVisible();
  const confirmation = dialog.locator('.flex.flex-col.items-center');
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByText('确认删除此规格？', { exact: true })).toBeVisible();
  await expect(confirmation.getByText('删除后不可恢复，该规格的库存数据将一并移除。', { exact: true })).toBeVisible();
  await expect(confirmation).toHaveCSS('flex-direction', 'column');
  await expect(confirmation).toHaveCSS('align-items', 'center');
});

test('product list image opens the shared full-height preview and badges use display names', async ({ page }) => {
  await prepareMerchant(page);
  await page.goto('/products');
  await page.locator('button[aria-label="预览重复商品名称"]').click();
  const imageDialog = page.getByRole('dialog', { name: '重复商品名称' });
  await expect(imageDialog).toBeVisible();
  const previewImage = imageDialog.getByRole('img', { name: '重复商品名称 1' });
  await expect(previewImage).toHaveCSS('object-fit', 'contain');
  const box = await previewImage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual((await page.evaluate(() => window.innerHeight)) + 1);
  await imageDialog.getByRole('button', { name: '关闭' }).click();
  await expect(imageDialog).toBeHidden();

  await page.getByTitle('预览').click();
  const productDialog = page.getByRole('dialog', { name: /\u91cd\u590d\u5546\u54c1\u540d\u79f0/ });
  const inlinePreview = productDialog.locator('button[aria-label="预览重复商品名称"] img');
  await expect(inlinePreview).toHaveCSS('position', 'absolute');
  await expect(inlinePreview).toHaveCSS('object-fit', 'contain');
  const inlineContainer = await inlinePreview.locator('..').boundingBox();
  const inlineImage = await inlinePreview.boundingBox();
  expect(inlineContainer).not.toBeNull();
  expect(inlineImage).not.toBeNull();
  expect(inlineImage!.width).toBeCloseTo(inlineContainer!.width, 0);
  expect(inlineImage!.height).toBeCloseTo(inlineContainer!.height, 0);
  await expect(productDialog.getByText('推荐', { exact: true })).toBeVisible();
  await expect(productDialog.getByText('recommended', { exact: true })).toHaveCount(0);
  await productDialog.getByRole('button', { name: '关闭' }).click();

  await page.goto('/products/product-1/edit');
  await page.locator('button[aria-label="预览商品图片 1"]').click();
  const uploadPreview = page.getByRole('dialog', { name: '商品图片 1' });
  await expect(uploadPreview.getByRole('img', { name: '商品图片 1 1' })).toHaveCSS('object-fit', 'contain');
});

test('opening change-password modal does not activate the pagination size selector', async ({ page }) => {
  await prepareMerchant(page);
  await page.goto('http://localhost:8088/products');
  const accountMenus = page.getByRole('button').filter({ hasText: '商户管理员' });
  await accountMenus.first().click();
  await page.locator('[role="menuitem"]:visible').filter({ hasText: '修改密码' }).click();
  const dialog = page.getByRole('dialog', { name: '修改密码' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[name="username"]')).toHaveAttribute('autocomplete', 'username');
  await expect(dialog.locator('input[name="username"]')).toHaveValue('13800000000');
  await page.waitForTimeout(300);
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  await expect(page.locator('.ant-pagination-options [role="combobox"]')).toHaveAttribute('aria-expanded', 'false');
});
