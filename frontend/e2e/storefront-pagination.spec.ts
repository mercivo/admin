import { expect, test } from '@playwright/test';

const products = Array.from({ length: 11 }, (_, index) => ({
  id: `product-${index + 1}`,
  nameZh: `分页商品 ${index + 1}`,
  description: '<p>第一行说明</p><p>第二行说明</p><p>第三行说明</p><p>第四行信息不可见</p>',
  price: '99.00', moq: 10, img: '', hot: false, tags: [], category: 'bags',
}));

test('published storefront uses localized Ant Design pagination and clamps product summaries', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-1', versionId: 'version-1', version: 1,
    site: { name: '测试站点', slug: 'test-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY' },
    config: {}, products, categories: [{ code: 'bags', label: '箱包', parentCode: null, sort: 1 }], testimonials: [],
  } } }));

  await page.goto(`${process.env.STOREFRONT_BASE_URL || 'http://localhost:8080'}/?site=test-site`);
  const productCards = page.locator('.site-renderer-root .editor-product-results .grid > div');
  await expect(productCards).toHaveCount(10);
  const summary = page.locator('.site-editor-product-summary').first();
  await expect(summary).toHaveCSS('-webkit-line-clamp', '2');
  await expect(summary).toHaveCSS('max-height', '38px');
  await expect(summary).toHaveCSS('line-height', '19px');
  await expect(summary).toHaveCSS('overflow', 'hidden');
  await expect(page.locator('.editor-language-trigger')).toContainText('zh_CN');
  await expect(page.locator('.ant-pagination-prev')).toHaveAttribute('title', '上一页');

  await page.locator('.ant-pagination-next').click();
  await expect(productCards).toHaveCount(1);
  await page.locator('.editor-language-trigger').click();
  await page.locator('.editor-language-popover button').filter({ hasText: 'en_US' }).click();
  await expect(page.locator('.ant-pagination-prev')).toHaveAttribute('title', 'Previous Page');
  expect(consoleErrors.filter(message => message.includes('same key'))).toEqual([]);
});

test('legacy public product detail paths render the shared site homepage', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-redirect', versionId: 'version-redirect', version: 1,
    site: { name: '路径兼容站点', slug: 'redirect-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY' },
    config: {}, products: [], categories: [], i18n: { sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } },
  } } }));
  await page.goto('http://localhost:8080/products/legacy-product?site=redirect-site');
  await expect(page.locator('.site-renderer-root')).toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.locator('.product-detail-page')).toHaveCount(0);
});
