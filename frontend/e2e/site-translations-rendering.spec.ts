import { expect, test, type Page } from '@playwright/test';

const adminBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:8088';
const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'http://localhost:8080';

const config = {
  status: 'draft', version: 1, page: 'home', themeColor: '#2F6FED', themeOpacity: 100,
  siteInfo: { brandLogoUrl: '', contactModalTitle: '联系我们', contactModalSubtitle: '中文联系说明', contactLabels: {}, contactDetails: {}, contactItems: [] },
  pages: { home: { sections: [
    { id: 'header-1', type: 'header', visible: true, title: '中文品牌', eyebrow: '中文公告', showEyebrow: true, navItems: [{ id: 'nav-products', label: '产品', targetId: 'products-1' }] },
    { id: 'hero-1', type: 'hero', visible: true, title: '中文主标题', subtitle: '中文副标题', eyebrow: '中文眉标', buttonText: '查看产品', secondaryButtonText: '获取报价', buttonAction: 'products-1', secondaryButtonAction: 'contactModal', showButton: true, showEyebrow: true, showSecondaryButton: true, showTrustBar: true, trustItems: [
      { id: 'quality', title: '品质保障', description: 'Strict Quality Inspection and Consistent Quality' },
      { id: 'service', title: '专业服务', description: 'One-on-One Procurement Consultation' },
      { id: 'custom', title: '灵活定制', description: 'Brand and Packaging Customization Supported' },
      { id: 'delivery', title: '全球交付', description: 'Serving Overseas Markets Reliably' },
    ] },
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

const prepareAdmin = async (page: Page, messages = i18n, productItems = [product]) => {
  let saveRequests = 0;
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'site.edit', 'site.publish'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.site.editor', 'site.edit', 'site.publish'] } } });
    if (url.pathname.endsWith('/workspace/config/siteEditor') && route.request().method() === 'PUT') { saveRequests += 1; return route.fulfill({ json: { data: route.request().postDataJSON()?.value || config } }); }
    if (url.pathname.endsWith('/workspace/config/siteEditor')) return route.fulfill({ json: { data: config } });
    if (url.pathname.endsWith('/workspace/config/system')) return route.fulfill({ json: { data: { storefront: { guestAccessEnabled: true, guestPriceMode: 'base' } } } });
    if (url.pathname.endsWith('/workspace/config/currency')) return route.fulfill({ json: { data: { defaultCurrency: 'CNY', currencies: [{ code: 'CNY', symbol: '¥', enabled: true }] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { id: 'site-1', name: '测试站点', description: '', logoUrl: '', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY' } } } });
    if (url.pathname.endsWith('/translations/messages')) return route.fulfill({ json: { data: messages } });
    if (url.pathname.endsWith('/storefront/product-pool')) return route.fulfill({ json: { data: { items: productItems, total: productItems.length, page: 1, pageSize: 50, categories, categoryCounts: { bags: productItems.length }, summary: { totalProducts: productItems.length } } } });
    if (url.pathname.endsWith('/admin/sites')) return route.fulfill({ json: { data: [{ id: 'site-1', name: '测试站点', slug: 'test-site', status: 'draft', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY' }] } });
    return route.fulfill({ json: { data: {} } });
  });
  return { saveRequests: () => saveRequests };
};

const selectEnglish = async (page: Page, selector: string) => {
  await page.locator(selector).click();
  await page.locator('.editor-language-popover button').filter({ hasText: 'en_US' }).click();
};

const expectPurchaseInfoStacked = async (page: Page) => {
  const purchaseInfo = page.getByTestId('site-product-purchase-info').first();
  await expect(purchaseInfo).toHaveCSS('flex-direction', 'column');
  await expect(purchaseInfo).toHaveCSS('align-items', 'flex-start');
  const [price, moq] = await Promise.all([purchaseInfo.getByTestId('site-product-price').boundingBox(), purchaseInfo.getByTestId('site-product-moq').boundingBox()]);
  expect(price).not.toBeNull();
  expect(moq).not.toBeNull();
  expect(price!.y).toBeGreaterThanOrEqual(moq!.y + moq!.height);
  expect(Math.abs(moq!.x - price!.x)).toBeLessThanOrEqual(1);
};

const expectSharedCopyLayout = async (page: Page) => {
  const values = await page.locator('[data-editor-canvas]').first().evaluate(element => {
    const heroCopy = element.querySelector('.editor-hero-copy') as HTMLElement;
    const heroTitle = heroCopy.querySelector('h2') as HTMLElement;
    const productDescription = element.querySelector('.editor-products-description') as HTMLElement;
    const copyStyle = getComputedStyle(heroCopy);
    const titleStyle = getComputedStyle(heroTitle);
    return {
      heroWidth: parseFloat(copyStyle.width),
      fontFamily: copyStyle.fontFamily,
      titleLineRatio: parseFloat(titleStyle.lineHeight) / parseFloat(titleStyle.fontSize),
      titleWrap: titleStyle.textWrap,
      productWidth: parseFloat(getComputedStyle(productDescription).width),
    };
  });
  expect(values.heroWidth).toBeGreaterThanOrEqual(700);
  expect(values.heroWidth).toBeLessThanOrEqual(920);
  expect(values.fontFamily).toContain('system-ui');
  expect(values.titleLineRatio).toBeCloseTo(1.12, 1);
  expect(values.titleWrap).toBe('balance');
  expect(values.productWidth).toBeGreaterThanOrEqual(520);
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

test('source-language editor canvas uses unsaved in-memory content instead of stale saved messages', async ({ page }) => {
  const staleMessages = { ...i18n, messages: { ...i18n.messages, zh_CN: {
    'editor:home:products-1:title': '已保存的旧产品标题',
    'product:product-1:name': '已保存的旧商品名称',
  } } };
  const requests = await prepareAdmin(page, staleMessages);
  await page.goto(`${adminBaseUrl}/site-editor`);
  const canvas = page.locator('.editor-canvas-scroll');
  await expect(canvas.getByRole('heading', { name: '中文产品标题' })).toBeVisible();
  await expect(canvas.getByText('中文商品', { exact: true })).toBeVisible();
  await page.locator('.editor-layer-list').getByText('产品列表', { exact: true }).click();
  const titleInput = page.locator('.editor-right-panel input[value="中文产品标题"]');
  await titleInput.fill('未保存的实时产品标题');
  await expect(canvas.getByRole('heading', { name: '未保存的实时产品标题' })).toBeVisible();
  expect(requests.saveRequests()).toBe(0);
  await selectEnglish(page, '.editor-canvas-scroll .editor-language-trigger');
  await expect(canvas.getByRole('heading', { name: 'English Products' })).toBeVisible();
  await page.locator('.editor-canvas-scroll .editor-language-trigger').click();
  await page.locator('.editor-language-popover button').filter({ hasText: 'zh_CN' }).click();
  await expect(canvas.getByRole('heading', { name: '未保存的实时产品标题' })).toBeVisible();
  expect(requests.saveRequests()).toBe(0);
});

test('product badge filters only show translated theme-aware options and support multi-select', async ({ page }) => {
  const recommended = { ...product, id: 'product-2', nameZh: '推荐商品', hot: false, badge: 'recommended' };
  await prepareAdmin(page, i18n, [product, recommended]);
  await page.goto(`${adminBaseUrl}/site-editor`);
  const canvas = page.locator('.editor-canvas-scroll');
  const filters = canvas.getByTestId('product-badge-filters');
  await expect(filters.getByRole('checkbox')).toHaveCount(4);
  await expect(filters.getByText('商品标记', { exact: true })).toHaveCount(0);
  await expect(filters.getByText('全选', { exact: true })).toHaveCount(0);
  await expect(filters.locator('small')).toHaveCount(0);
  await expect(filters).toHaveCSS('border-top-width', '0px');
  await expect(filters).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(filters).toHaveCSS('box-shadow', 'none');
  const hot = filters.getByRole('checkbox', { name: '爆品', exact: true });
  const recommendedFilter = filters.getByRole('checkbox', { name: '推荐', exact: true });
  await hot.check();
  await expect(canvas.getByText('中文商品', { exact: true })).toBeVisible();
  await expect(canvas.getByText('推荐商品', { exact: true })).toHaveCount(0);
  await expect.poll(async () => hot.locator('xpath=../..').evaluate(label => {
    const canvasRoot = label.closest<HTMLElement>('[data-editor-canvas]')!;
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(canvasRoot).getPropertyValue('--site-theme');
    canvasRoot.appendChild(probe);
    const themeColor = getComputedStyle(probe).color;
    probe.remove();
    return getComputedStyle(label).color === themeColor;
  })).toBe(true);
  await recommendedFilter.check();
  await expect(canvas.getByText('推荐商品', { exact: true })).toBeVisible();
  await hot.uncheck();
  await expect(canvas.getByText('中文商品', { exact: true })).toHaveCount(0);
  await recommendedFilter.uncheck();
  await expect(canvas.getByText('中文商品', { exact: true })).toBeVisible();
  await selectEnglish(page, '.editor-canvas-scroll .editor-language-trigger');
  await expect(filters.getByRole('checkbox', { name: 'New', exact: true })).toBeVisible();
  await expect(filters.getByRole('checkbox', { name: 'Hot', exact: true })).toBeVisible();
  await expect(filters.getByRole('checkbox', { name: 'Bestseller', exact: true })).toBeVisible();
  await expect(filters.getByRole('checkbox', { name: 'Recommended', exact: true })).toBeVisible();
});

test('product pagination keeps the site theme color in the editor canvas and draft preview', async ({ page }) => {
  const productItems = Array.from({ length: 11 }, (_, index) => ({
    ...product,
    id: `product-${index + 1}`,
    nameZh: `分页商品 ${index + 1}`,
    hot: false,
    badge: '',
  }));
  await prepareAdmin(page, i18n, productItems);
  await page.goto(`${adminBaseUrl}/site-editor`);

  const editorActivePage = page.locator('.editor-canvas-scroll .ant-pagination-item-active');
  await expect(editorActivePage.locator('a')).toHaveCSS('color', 'rgb(47, 111, 237)');
  await expect(editorActivePage).toHaveCSS('border-color', 'rgb(47, 111, 237)');

  await page.goto(`${adminBaseUrl}/site-preview`);
  const previewActivePage = page.locator('[data-site-preview-page] .ant-pagination-item-active');
  await expect(previewActivePage.locator('a')).toHaveCSS('color', 'rgb(47, 111, 237)');
  await expect(previewActivePage).toHaveCSS('border-color', 'rgb(47, 111, 237)');
  await page.locator('.ant-pagination-next').click();
  await expect(page.locator('.ant-pagination-item-active')).toContainText('2');
});

test('hero service promises use readable type and center each icon-text group', async ({ page }) => {
  await prepareAdmin(page);
  await page.goto(`${adminBaseUrl}/site-editor`);
  const firstItem = page.locator('.editor-canvas-scroll .editor-hero-trust-item').first();
  const text = firstItem.locator(':scope > span');
  await expect(firstItem).toHaveCSS('display', 'grid');
  await expect(firstItem).toHaveCSS('justify-content', 'center');
  await expect(text.locator('strong')).toHaveCSS('font-size', '14px');
  await expect(text.locator('small')).toHaveCSS('font-size', '12px');
  const [itemBox, iconBox, textBox] = await Promise.all([firstItem.boundingBox(), firstItem.locator(':scope > div').boundingBox(), text.boundingBox()]);
  expect(itemBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(textBox).not.toBeNull();
  expect(textBox!.width).toBeGreaterThanOrEqual(170);
  expect(Math.abs((iconBox!.x + textBox!.x + textBox!.width) / 2 - (itemBox!.x + itemBox!.width / 2))).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: '移动视图' }).click();
  await expect(text.locator('small')).toHaveCSS('font-size', '12px');
  expect((await text.boundingBox())!.width).toBeGreaterThanOrEqual(120);
});

test('shared storefront typography keeps hero and product copy at comfortable responsive widths', async ({ page }) => {
  await prepareAdmin(page);
  await page.goto(`${adminBaseUrl}/site-editor`);

  const canvas = page.locator('.editor-canvas-scroll [data-editor-canvas]');
  const heroCopy = canvas.locator('.editor-hero-copy');
  const heroTitle = heroCopy.locator('h2');
  const productDescription = canvas.locator('.editor-products-description');
  const desktopStyles = await heroCopy.evaluate(element => {
    const copy = getComputedStyle(element);
    const title = getComputedStyle(element.querySelector('h2')!);
    return {
      width: parseFloat(copy.width),
      fontFamily: copy.fontFamily,
      fontSize: parseFloat(title.fontSize),
      lineHeight: parseFloat(title.lineHeight),
      wrap: title.textWrap,
    };
  });
  expect(desktopStyles.width).toBeGreaterThan(700);
  expect(desktopStyles.width).toBeLessThanOrEqual(920);
  expect(desktopStyles.fontFamily).toContain('system-ui');
  expect(desktopStyles.lineHeight / desktopStyles.fontSize).toBeCloseTo(1.12, 1);
  expect(desktopStyles.wrap).toBe('balance');
  expect(parseFloat(await productDescription.evaluate(element => getComputedStyle(element).width))).toBeGreaterThanOrEqual(520);
  await expect(productDescription).toHaveCSS('text-align', 'right');

  await page.getByRole('button', { name: '移动视图' }).click();
  await expect(heroCopy).toHaveCSS('width', '390px');
  await expect(productDescription).toHaveCSS('text-align', 'left');
  const mobileStyles = await heroTitle.evaluate(element => {
    const style = getComputedStyle(element);
    return { fontSize: parseFloat(style.fontSize), lineHeight: parseFloat(style.lineHeight) };
  });
  expect(mobileStyles.lineHeight / mobileStyles.fontSize).toBeCloseTo(1.15, 1);
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
  await expectSharedCopyLayout(page);
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
  await expectSharedCopyLayout(page);
});
