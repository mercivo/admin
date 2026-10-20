import { expect, test, type Page } from '@playwright/test';

const product = { id: 'guest-product', nameZh: '游客商品', description: '<p>商品说明</p>', price: '88.00', basePrice: 88, moq: 1, img: '', images: [], hot: false, tags: [], category: 'bags', variants: [] };

const prepare = async (page: Page, guestAccessEnabled: boolean, guestPriceMode: 'base' | 'hidden') => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'site.edit', 'site.publish'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.site.editor', 'site.edit', 'site.publish'] } } });
    if (url.pathname.endsWith('/workspace/config/siteEditor')) return route.fulfill({ json: { data: {} } });
    if (url.pathname.endsWith('/workspace/config/system')) return route.fulfill({ json: { data: { inventoryWarning: { enabled: true, threshold: 10 }, storefront: { guestAccessEnabled, guestPriceMode, guestPricePercentage: 100 } } } });
    if (url.pathname.endsWith('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', name: '人民币', symbol: '¥', enabled: true }] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { id: 'site-1', name: '测试站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' } } } });
    if (url.pathname.endsWith('/storefront/product-pool')) return route.fulfill({ json: { data: { items: [product], total: 1, page: 1, pageSize: 50, categories: [{ code: 'bags', label: '箱包', status: 'enabled', sort: 1, children: [] }], categoryCounts: { bags: 1 }, summary: { totalProducts: 1 } } } });
    if (url.pathname.endsWith('/admin/sites')) return route.fulfill({ json: { data: [{ id: 'site-1', name: '测试站点', slug: 'test-site', status: 'draft', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' }] } });
    return route.fulfill({ json: { data: {} } });
  });
};

test('site design canvas applies the hidden guest price strategy', async ({ page }) => {
  await prepare(page, true, 'hidden');
  await page.goto('http://localhost:8088/site-editor');
  const canvas = page.locator('.editor-canvas-scroll');
  await expect(canvas.getByText('游客商品', { exact: true })).toBeVisible();
  await expect(canvas.getByText(/¥\s*88\.00/)).toHaveCount(0);
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
