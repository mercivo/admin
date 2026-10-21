import { expect, test, type Page } from '@playwright/test';

const adminBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:8088';
const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'http://localhost:8080';

const config = {
  status: 'draft', version: 1, page: 'home', themeColor: '#1A3D2E', themeOpacity: 100,
  siteInfo: { brandLogoUrl: '', contactModalTitle: '联系我们', contactModalSubtitle: '中文联系说明', contactLabels: {}, contactDetails: {}, contactItems: [] },
  pages: { home: { sections: [
    { id: 'header-1', type: 'header', visible: true, title: '中文品牌', eyebrow: '中文公告', showEyebrow: true, navItems: [{ id: 'nav-products', label: '产品', targetId: 'products-1' }] },
    { id: 'hero-1', type: 'hero', visible: true, title: '中文主标题', subtitle: '中文副标题', eyebrow: '中文眉标', buttonText: '查看产品', secondaryButtonText: '获取报价', buttonAction: 'products-1', secondaryButtonAction: 'contactModal', showButton: true, showEyebrow: true, showSecondaryButton: true, showTrustBar: false },
    { id: 'products-1', type: 'products', visible: true, title: '中文产品标题', subtitle: '中文产品说明', eyebrow: '中文产品眉标', buttonText: '联系我们', buttonAction: 'contactModal', showButton: true, showEyebrow: true, showPrice: true, showMoq: true, showCategories: true, columns: 3 },
    { id: 'contact-1', type: 'contactModal', visible: false, title: '联系我们', subtitle: '中文联系说明' },
    { id: 'footer-1', type: 'footer', visible: true, title: '中文企业', subtitle: '中文企业说明', copyrightText: '中文版权信息', navItems: [], socialLinks: [], showContact: true },
  ] } },
  translationDescriptors: [
    { key: 'editor:home:header-1:title', pageId: 'home', pageName: '首页', componentId: 'header-1', componentType: 'header', componentName: '页头导航', path: 'pages.home.sections.header-1.title', fieldLabel: '品牌名称', order: 1 },
    { key: 'editor:home:hero-1:title', pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', path: 'pages.home.sections.hero-1.title', fieldLabel: '主标题', order: 2 },
    { key: 'editor:home:products-1:title', pageId: 'home', pageName: '首页', componentId: 'products-1', componentType: 'products', componentName: '产品列表', path: 'pages.home.sections.products-1.title', fieldLabel: '标题', order: 3 },
  ],
};

const product = { id: 'product-1', nameZh: '中文商品', description: '<p>中文商品说明</p>', price: '88.00～108.00', basePrice: 88, priceVisible: true, moq: 10, img: '', images: [], hot: true, badge: 'hot', tags: ['定制'], category: 'bags', variants: [] };
const categories = [{ code: 'bags', label: '箱包', status: 'enabled', sort: 1, children: [] }];
const i18n = { sourceLocale: 'zh_CN', locales: ['zh_CN', 'en_US'], messages: { zh_CN: {}, en_US: {
  'editor:home:header-1:title': 'English Brand',
  'editor:home:hero-1:title': 'English Hero Title',
  'editor:home:products-1:title': 'English Products',
  'product:product-1:name': 'English Product',
  'product:product-1:description': '<p>English product description</p>',
  'product:product-1:tags': 'Custom',
  'category:__all__:label': 'All Products',
  'category:bags:label': 'Bags',
  'constant:product.badges': 'New;Hot;Bestseller;Recommended',
  'constant:product.moq': 'MOQ',
  'constant:storefront.quickNavigation': 'Quick Navigation',
  'editor:home:footer-1:copyrightText': 'English Copyright',
} } };

const prepareAdmin = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'site.edit', 'site.publish'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.site.editor', 'site.edit', 'site.publish'] } } });
    if (url.pathname.endsWith('/workspace/config/siteEditor')) return route.fulfill({ json: { data: config } });
    if (url.pathname.endsWith('/workspace/config/system')) return route.fulfill({ json: { data: { storefront: { guestAccessEnabled: true, guestPriceMode: 'base' } } } });
    if (url.pathname.endsWith('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', symbol: '¥', enabled: true }] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { id: 'site-1', name: '测试站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY' } } } });
    if (url.pathname.endsWith('/translations/messages')) return route.fulfill({ json: { data: i18n } });
    if (url.pathname.endsWith('/storefront/product-pool')) return route.fulfill({ json: { data: { items: [product], total: 1, page: 1, pageSize: 50, categories, categoryCounts: { bags: 1 }, summary: { totalProducts: 1 } } } });
    if (url.pathname.endsWith('/admin/sites')) return route.fulfill({ json: { data: [{ id: 'site-1', name: '测试站点', slug: 'test-site', status: 'draft', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY' }] } });
    return route.fulfill({ json: { data: {} } });
  });
};

const selectEnglish = async (page: Page, selector: string) => {
  await page.locator(selector).click();
  await page.locator('.editor-language-popover button').filter({ hasText: 'en_US' }).click();
};

const expectPurchaseInfoStacked = async (page: Page) => {
  const purchaseInfo = page.getByTestId('site-product-purchase-info').first();
  await expect(purchaseInfo).toHaveCSS('flex-direction', 'column');
  await expect(purchaseInfo).toHaveCSS('align-items', 'flex-end');
  const [price, moq] = await Promise.all([purchaseInfo.getByTestId('site-product-price').boundingBox(), purchaseInfo.getByTestId('site-product-moq').boundingBox()]);
  expect(price).not.toBeNull();
  expect(moq).not.toBeNull();
  expect(moq!.y).toBeGreaterThanOrEqual(price!.y + price!.height);
  expect(Math.abs((moq!.x + moq!.width) - (price!.x + price!.width))).toBeLessThanOrEqual(1);
};

test('site design canvas renders saved English page and product translations', async ({ page }) => {
  await prepareAdmin(page);
  await page.goto(`${adminBaseUrl}/site-editor`);
  await selectEnglish(page, '.editor-canvas-scroll .editor-language-trigger');
  const canvas = page.locator('.editor-canvas-scroll');
  await expect(canvas.getByRole('heading', { name: 'English Hero Title' })).toBeVisible();
  await expect(canvas.getByRole('heading', { name: 'English Products' })).toBeVisible();
  await expect(canvas.getByText('English Product', { exact: true })).toBeVisible();
  await expect(canvas.getByText('English product description', { exact: true })).toBeVisible();
  await expect(canvas.getByText('Custom', { exact: true })).toBeVisible();
  await expect(canvas.getByText('Bags', { exact: true }).first()).toBeVisible();
  await expect(canvas.getByText('MOQ 10', { exact: true })).toBeVisible();
  await expect(canvas.getByText('Quick Navigation', { exact: true })).toBeVisible();
  await expect(canvas.getByText('English Copyright', { exact: true })).toBeVisible();
  await expect(canvas.getByTestId('site-product-price')).toHaveText('¥ 88.00～108.00');
  await expectPurchaseInfoStacked(page);
});

test('draft preview renders saved English translations after language switching', async ({ page }) => {
  await prepareAdmin(page);
  await page.goto(`${adminBaseUrl}/site-preview`);
  await selectEnglish(page, '.editor-language-trigger');
  await expect(page.getByRole('heading', { name: 'English Hero Title' })).toBeVisible();
  await expect(page.getByText('English Product', { exact: true })).toBeVisible();
  await expect(page.getByText('Bags', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Quick Navigation', { exact: true })).toBeVisible();
  await expect(page.getByText('English Copyright', { exact: true })).toBeVisible();
  await expect(page.getByTestId('site-product-price')).toHaveText('¥ 88.00～108.00');
  await expectPurchaseInfoStacked(page);
});

test('published storefront renders saved English page and product translations', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-1', versionId: 'version-1', version: 1, locale: 'en_US',
    site: { name: '测试站点', slug: 'test-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY', currencySymbol: '¥' },
    config, products: [product], categories: [{ code: 'bags', label: '箱包', parentCode: null, sort: 1 }], i18n,
  } } }));
  await page.goto(`${storefrontBaseUrl}/?site=test-site&lang=en_US`);
  await expect(page.getByRole('heading', { name: 'English Hero Title' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'English Products' })).toBeVisible();
  await expect(page.getByText('English Product', { exact: true })).toBeVisible();
  await expect(page.getByText('English product description', { exact: true })).toBeVisible();
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
  await expect(page.getByText('Bags', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('MOQ 10', { exact: true })).toBeVisible();
  await expect(page.getByText('Quick Navigation', { exact: true })).toBeVisible();
  await expect(page.getByText('English Copyright', { exact: true })).toBeVisible();
  await expect(page.getByTestId('site-product-price')).toHaveText('¥ 88.00～108.00');
  await expectPurchaseInfoStacked(page);
});
