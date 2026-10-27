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
    site: { name: '测试站点', slug: 'test-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'zh_TW', 'zh_HK', 'en_US', 'en_GB'], defaultCurrency: 'CNY' },
    config: { themeColor: '#C2410C', pages: { home: { sections: [
      { id: 'header-1', type: 'header', visible: true, navItems: [] },
      { id: 'products-1', type: 'products', visible: true },
    ] } } }, products, categories: [{ code: 'bags', label: '箱包', parentCode: null, sort: 1 }], testimonials: [],
  } } }));

  await page.goto(`${process.env.STOREFRONT_BASE_URL || 'http://localhost:8080'}/?site=test-site`);
  const productCards = page.locator('.site-renderer-root .editor-product-results .grid > div');
  await expect(productCards).toHaveCount(10);
  const summary = page.locator('.site-editor-product-summary').first();
  await expect(summary).toHaveCSS('-webkit-line-clamp', '2');
  await expect(summary).toHaveCSS('max-height', '44px');
  await expect(summary).toHaveCSS('line-height', '22px');
  await expect(summary).toHaveCSS('overflow', 'hidden');
  const chineseName = await page.evaluate(() => new Intl.DisplayNames(['zh-CN'], { type: 'language' }).of('zh-Hans'));
  const englishNameInChinese = await page.evaluate(() => new Intl.DisplayNames(['zh-CN'], { type: 'language' }).of('en'));
  const traditionalChineseName = await page.evaluate(() => new Intl.DisplayNames(['zh-CN'], { type: 'language' }).of('zh-Hant'));
  await expect(page.locator('.editor-language-trigger')).toContainText(chineseName!);
  await expect(page.locator('.ant-pagination-prev')).toHaveAttribute('title', '上一页');
  const activePage = page.locator('.ant-pagination-item-active');
  await expect(activePage.locator('a')).toHaveCSS('color', 'rgb(194, 65, 12)');
  await expect(activePage).toHaveCSS('border-color', 'rgb(194, 65, 12)');

  const header = page.locator('.editor-site-header');
  const navigation = page.locator('.editor-header-desktop-nav');
  const [headerBox, navigationBox] = await Promise.all([header.boundingBox(), navigation.boundingBox()]);
  expect(headerBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(Math.abs((navigationBox!.x + navigationBox!.width / 2) - (headerBox!.x + headerBox!.width / 2))).toBeLessThanOrEqual(1);

  await page.locator('.ant-pagination-next').click();
  await expect(productCards).toHaveCount(1);
  await page.locator('.editor-language-trigger').click();
  const languagePopover = page.locator('.editor-language-popover');
  await expect(languagePopover.locator('.editor-language-popover-head')).toHaveCount(0);
  await expect(languagePopover).not.toContainText('选择语言');
  await expect(languagePopover).not.toContainText('种可用语言');
  await expect(languagePopover.locator('button').filter({ hasText: 'en_US' }).locator('strong')).toHaveText(englishNameInChinese!);
  await expect(languagePopover.locator('button').filter({ hasText: 'en_GB' }).locator('strong')).toHaveText(englishNameInChinese!);
  await expect(languagePopover.locator('button').filter({ hasText: 'zh_TW' }).locator('strong')).toHaveText(traditionalChineseName!);
  await expect(languagePopover.locator('button').filter({ hasText: 'zh_HK' }).locator('strong')).toHaveText(traditionalChineseName!);
  await expect(languagePopover).not.toContainText(/美国|英国|台湾|香港/);
  await page.locator('.editor-language-popover button').filter({ hasText: 'en_US' }).click();
  await expect(page.locator('.ant-pagination-prev')).toHaveAttribute('title', 'Previous Page');
  await page.locator('.editor-language-trigger').click();
  const chineseNameInEnglish = await page.evaluate(() => new Intl.DisplayNames(['en-US'], { type: 'language' }).of('zh-Hans'));
  await expect(page.locator('.editor-language-popover button').filter({ hasText: chineseNameInEnglish! })).toBeVisible();
  await expect(page.locator('.editor-language-popover')).not.toContainText('英语');
  await expect(page.locator('.editor-language-popover')).not.toContainText(/United States|United Kingdom|Taiwan|Hong Kong/);
  expect(consoleErrors.filter(message => message.includes('same key'))).toEqual([]);
});

test('public product detail paths render the shared fixed detail page', async ({ page }) => {
  const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'http://localhost:8080';
  const product = {
    id: 'detail-product', nameZh: '出口定制包', description: '<p>适合全球品牌客户的定制商品。</p>',
    seoTitle: '出口定制包详情', sku: 'BAG-001', price: '100.00～120.00', basePrice: 100, priceVisible: true,
    moq: 50, img: '', images: [], hot: false, badge: 'recommended', likeCount: 8, tags: ['OEM'], category: 'bags',
    variants: [{ id: 'large', specification: '尺寸', option: 'L', stock: 10, surcharge: 20 }],
  };
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-redirect', versionId: 'version-redirect', version: 1, locale: 'en_US',
    site: { name: '路径兼容站点', slug: 'redirect-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'BAM', currencySymbol: 'KM' },
    config: {}, products: [product], categories: [{ code: 'bags', label: '箱包', parentCode: null, sort: 1 }], i18n: { sourceLocale: 'zh_CN', locales: ['zh_CN', 'en_US'], messages: { zh_CN: {}, en_US: {
      'product:detail-product:name': 'Custom Export Bag',
      'product:detail-product:description': '<p>Custom goods for global brands.</p>',
      'product:detail-product:tags': 'Private Label',
      'product:detail-product:variant:large:specification': 'Size',
      'product:detail-product:variant:large:option': 'Large',
      'category:bags:label': 'Bags',
      'editor:product:product-detail:home': 'Home',
      'editor:product:product-detail:likes': 'likes',
      'editor:product:product-detail:contactForPrice': 'Contact for price',
      'editor:product:product-detail:contactNote': 'Contact us for pricing, customization, and delivery details.',
      'editor:product:product-detail:specifications': 'Specifications',
      'editor:siteInfo:contactModalTitle': 'Contact Us',
      'editor:product:product-detail:descriptionEyebrow': 'PRODUCT DETAILS',
      'editor:product:product-detail:descriptionTitle': 'Product Details',
      'editor:product:product-detail:notFoundTitle': 'Product unavailable',
      'editor:product:product-detail:notFoundDescription': 'This product is currently unavailable.',
      'editor:product:product-detail:backHome': 'Back to Home',
    } } },
  } } }));
  await page.goto(`${storefrontBaseUrl}/products/detail-product?site=redirect-site&lang=en_US`);
  const detail = page.locator('.product-detail-page');
  await expect(detail).toBeVisible();
  await expect(page).toHaveTitle('Custom Export Bag｜路径兼容站点');
  await expect(detail.getByRole('heading', { name: 'Custom Export Bag', level: 1 })).toBeVisible();
  await expect(detail.getByText('BAG-001')).toHaveCount(0);
  await expect(detail.getByText('推荐', { exact: true })).toBeVisible();
  await expect(detail.getByText('8 likes')).toBeVisible();
  await expect(detail.getByText('Bags', { exact: true })).toBeVisible();
  await expect(detail.getByText('Private Label', { exact: true })).toBeVisible();
  await expect(detail.getByText('Contact us for pricing, customization, and delivery details.')).toBeVisible();
  await expect(detail.getByText('最低起订量')).toHaveCount(0);
  await expect(detail.getByText('商品分类')).toHaveCount(0);
  await expect(detail.getByText('PRODUCT DETAILS', { exact: true })).toBeVisible();
  await expect(detail.getByRole('heading', { name: 'Product Details' })).toBeVisible();
  await expect(detail.getByTestId('product-detail-price')).toHaveText('KM 100.00～120.00');
  await expect(page.locator('.product-detail-sticky')).toHaveCSS('position', 'sticky');
  await expect(detail.getByText(/库存|购物车|数量|分享/)).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => Math.round((await page.locator('.product-detail-sticky').boundingBox())?.y || 0)).toBe(0);
  await detail.getByRole('button', { name: 'Size：Large' }).click();
  await expect(detail.getByTestId('product-detail-price')).toHaveText('KM 120.00');
  await detail.getByRole('button', { name: 'Contact Us' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('.ant-modal-close').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Home' }).first().click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.locator('.product-detail-page')).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('.product-detail-page')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.product-detail-page')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${storefrontBaseUrl}/products/detail-product?site=redirect-site&lang=en_US`);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  product.priceVisible = false;
  await page.reload();
  await expect(detail.getByTestId('product-detail-price')).toHaveText('Contact for price');
  await page.getByRole('button', { name: 'Home' }).first().click();
  await expect(page.locator('.editor-product-results').getByText(/KM\s*100\.00/)).toHaveCount(0);

  await page.goto(`${storefrontBaseUrl}/products/missing-product?site=redirect-site&lang=en_US`);
  await expect(page.getByRole('heading', { name: 'Product unavailable' })).toBeVisible();
});

test('published storefront shows localized notice when guest access is disabled', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'private-site', versionId: 'private-version', version: 1, locale: 'en_US',
    site: { name: '私有站点', slug: 'private-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY', currencySymbol: '¥', guestAccessEnabled: false, guestPriceMode: 'hidden' },
    config: {}, products: [], categories: [], i18n: { sourceLocale: 'zh_CN', locales: ['zh_CN', 'en_US'], messages: { zh_CN: {}, en_US: {
      'system:guestAccess.disabledTitle': 'Guest access is unavailable',
      'system:guestAccess.disabledDescription': 'Please contact the site administrator for access.',
    } } },
  } } }));

  await page.goto('http://localhost:8080/?site=private-site&lang=en_US');
  const notice = page.getByRole('alert');
  await expect(notice.getByRole('heading', { name: 'Guest access is unavailable' })).toBeVisible();
  await expect(notice.getByText('Please contact the site administrator for access.')).toBeVisible();
  await expect(page.locator('.editor-product-results')).toHaveCount(0);
});
