import { expect, test, type Page } from '@playwright/test';

const product = { id: 'guest-product', nameZh: '游客商品', description: '<p>商品说明</p>', price: '88.00', basePrice: 88, moq: 1, img: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', images: [], hot: false, tags: [], category: 'bags', variants: [] };

const prepare = async (page: Page, guestAccessEnabled: boolean, guestPriceMode: 'base' | 'hidden', tags: string[] = [], permissions = ['page.site.editor', 'site.edit', 'site.publish']) => {
  await page.addInitScript((grantedPermissions: string[]) => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: grantedPermissions }));
  }, permissions);
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.pathname.endsWith('/workspace/config/siteEditor')) return route.fulfill({ json: { data: {} } });
    if (url.pathname.endsWith('/workspace/config/system')) return route.fulfill({ json: { data: { inventoryWarning: { enabled: true, threshold: 10 }, storefront: { guestAccessEnabled, guestPriceMode, guestPricePercentage: 100 } } } });
    if (url.pathname.endsWith('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', name: '人民币', symbol: '¥', enabled: true }] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { id: 'site-1', name: '测试站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' } } } });
    if (url.pathname.endsWith('/storefront/product-pool')) return route.fulfill({ json: { data: { items: [{ ...product, tags }], total: 1, page: 1, pageSize: 50, categories: [{ code: 'bags', label: '箱包', status: 'enabled', sort: 1, children: [] }], categoryCounts: { bags: 1 }, summary: { totalProducts: 1 } } } });
    if (url.pathname.endsWith('/admin/sites')) return route.fulfill({ json: { data: [{ id: 'site-1', name: '测试站点', slug: 'test-site', status: 'draft', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' }] } });
    return route.fulfill({ json: { data: {} } });
  });
};

test('site design canvas applies the hidden guest price strategy', async ({ page }) => {
  await prepare(page, true, 'hidden');
  await page.goto('/site-editor');
  const canvas = page.locator('.editor-canvas-scroll');
  await expect(canvas.getByText('游客商品', { exact: true })).toBeVisible();
  await expect(canvas.getByText(/¥\s*88\.00/)).toHaveCount(0);
});

test('site design toolbar renders compact icon actions with hover labels', async ({ page }) => {
  await prepare(page, true, 'base');
  await page.goto('/site-editor');

  const toolbarActions = page.locator('.editor-toolbar-action');
  await expect(toolbarActions).toHaveCount(4);
  expect(await toolbarActions.allTextContents()).toEqual(['', '', '', '']);
  for (const label of ['保存草稿', '站点预览', '查看已发布站点', '发布站点']) {
    const action = page.getByRole('button', { name: label, exact: true });
    await expect(action).toHaveCSS('width', '34px');
    await action.locator('..').hover();
    await expect(page.locator('.ant-tooltip').filter({ hasText: label })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: '查看已发布站点' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '发布站点', exact: true })).toHaveClass(/is-primary/);
});

test('site design toolbar keeps preview but hides publish actions without publish permission', async ({ page }) => {
  await prepare(page, true, 'base', [], ['page.site.editor', 'site.edit']);
  await page.goto('/site-editor');

  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '站点预览', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看已发布站点', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '发布站点', exact: true })).toHaveCount(0);
  await expect(page.getByText('当前套餐仅支持草稿', { exact: true })).toBeVisible();
});

test('site design product cards do not reserve a tag row when tags are empty', async ({ page }) => {
  await prepare(page, true, 'base');
  await page.goto('/site-editor');

  const card = page.locator('[data-editor-canvas] .group').filter({ hasText: '游客商品' }).first();
  const summary = card.locator('.site-editor-product-summary');
  const tagRow = card.locator('.site-editor-product-summary + [class~="my-2.5"]');
  await expect(summary).toHaveCSS('margin-bottom', '10px');
  await expect(tagRow).toBeHidden();
});

test('site design product cards put spacing below the description instead of above tags', async ({ page }) => {
  await prepare(page, true, 'base', ['定制']);
  await page.goto('/site-editor');

  const card = page.locator('[data-editor-canvas] .group').filter({ hasText: '游客商品' }).first();
  await expect(card.locator('.site-editor-product-summary')).toHaveCSS('margin-bottom', '10px');
  await expect(card.locator('.site-editor-product-summary + [class~="my-2.5"]')).toHaveCSS('margin-top', '0px');
});

test('site design product cards visually separate the unchanged image canvas', async ({ page }) => {
  await prepare(page, true, 'base');
  await page.goto('/site-editor');

  const imageArea = page.locator('[data-editor-canvas] .site-product-card-image').first();
  const image = imageArea.getByRole('img', { name: '游客商品' });
  await expect(imageArea).toHaveCSS('background-color', 'rgb(245, 246, 244)');
  await expect(imageArea).toHaveCSS('box-shadow', 'rgb(229, 232, 228) 0px 0px 0px 1px inset');
  await expect(image).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(image).toHaveCSS('object-fit', 'contain');
  await expect(image).toHaveCSS('object-position', '50% 50%');
});

test('draft preview renders the guest access disabled notice', async ({ page }) => {
  await prepare(page, false, 'hidden');
  await page.goto('http://localhost:8088/site-preview');
  const notice = page.getByRole('alert');
  await expect(notice.getByRole('heading', { name: '暂不开放游客访问' })).toBeVisible();
  await expect(notice.getByText('当前站点仅对授权客户开放，请联系站点管理员获取访问权限。')).toBeVisible();
});

test('draft preview applies the hidden guest price strategy', async ({ page }) => {
  await prepare(page, true, 'hidden');
  await page.goto('http://localhost:8088/site-preview');
  await expect(page.getByText('游客商品', { exact: true })).toBeVisible();
  await expect(page.getByText(/¥\s*88\.00/)).toHaveCount(0);
});
