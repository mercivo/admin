import { expect, test, type Page } from '@playwright/test';

type TranslationItem = {
  key: string;
  resourceType: string;
  resourceId: string;
  sourceText: string;
  meta?: Record<string, unknown>;
};

const item = (value: TranslationItem) => ({
  contentFormat: 'text', required: true, value: '', status: 'missing',
  updatedAt: '2026-10-15T00:00:00.000Z', ...value,
});

const prepare = async (page: Page, itemsByType: Record<string, ReturnType<typeof item>[]>) => {
  const requestedTypes: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) {
      return route.fulfill({ json: { data: { site: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    }
    if (url.pathname.endsWith('/translations')) {
      const type = url.searchParams.get('resourceType') || '';
      requestedTypes.push(type);
      const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
      const all = itemsByType[type] || [];
      const items = keyword ? all.filter(entry => `${entry.key}\n${entry.sourceText}`.toLowerCase().includes(keyword)) : all;
      return route.fulfill({ json: { data: { items, total: items.length, page: 1, pageSize: 200, locale: 'en_US', summary: [{ locale: 'en_US', total: items.length, completed: 0, stale: 0, missing: items.length, percent: 0 }] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  return requestedTypes;
};

test('keyword matches are consolidated into one search result card', async ({ page }) => {
  await prepare(page, {
    product: [
      item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲', meta: { sku: 'SKU-1' } }),
      item({ key: 'product:p2:name', resourceType: 'product', resourceId: 'p2', sourceText: '商品乙', meta: { sku: 'SKU-2' } }),
    ],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await expect(page.locator('article')).toHaveCount(2);
  await page.getByPlaceholder('搜索稳定键、中文原文或译文').fill('商品');
  await expect(page.getByRole('heading', { name: '搜索结果', exact: true })).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.locator('article').getByText('2 个字段', { exact: true })).toBeVisible();
});

test('public API errors use readable field labels instead of split error-code letters', async ({ page }) => {
  await prepare(page, {
    system: [
      item({ key: 'system:apiErrors.SITE_NOT_FOUND_OR_UNPUBLISHED', resourceType: 'system', resourceId: 'storefront', sourceText: '站点不存在或尚未发布。' }),
      item({ key: 'system:apiErrors.NETWORK_ERROR', resourceType: 'system', resourceId: 'storefront', sourceText: '网络连接异常，请稍后重试。' }),
    ],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '系统文案', exact: true }).click();

  const feedback = page.locator('article').filter({ has: page.getByRole('heading', { name: '公开接口反馈', exact: true }) });
  await expect(feedback.getByText('站点不可访问', { exact: true })).toBeVisible();
  await expect(feedback.getByText('网络异常', { exact: true })).toBeVisible();
  await expect(feedback.getByText(/api Errors\./)).toHaveCount(0);
});

test('contact empty copy is configurable in the system empty-data card', async ({ page }) => {
  await prepare(page, {
    system: [
      item({ key: 'system:empty.contactInformation', resourceType: 'system', resourceId: 'storefront', sourceText: '暂无联系信息' }),
    ],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '系统文案', exact: true }).click();
  const emptyCopy = page.locator('article').filter({ has: page.getByRole('heading', { name: '空数据文案', exact: true }) });
  await expect(emptyCopy.getByText('联系信息空数据', { exact: true })).toBeVisible();
  await expect(emptyCopy.getByRole('textbox', { name: '联系信息空数据中文原文' })).toHaveValue('暂无联系信息');
});

test('category levels use Chinese numerals without card descriptions', async ({ page }) => {
  await prepare(page, {
    category: [
      item({ key: 'category:c1:label', resourceType: 'category', resourceId: 'c1', sourceText: '箱包', meta: { level: 1, sort: 1, path: ['箱包'] } }),
      item({ key: 'category:c2:label', resourceType: 'category', resourceId: 'c2', sourceText: '手提包', meta: { level: 2, sort: 1, path: ['箱包', '手提包'] } }),
    ],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '商品分类', exact: true }).click();
  await expect(page.getByRole('heading', { name: '一级分类', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '二级分类', exact: true })).toBeVisible();
  await expect(page.getByText(/汇总维护全部/)).toHaveCount(0);
});

test('site design groups footer social copy with the footer card', async ({ page }) => {
  await prepare(page, {
    editor: [
      item({ key: 'editor:siteInfo:contact:phone-item:content', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '400-800-1234', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '内容', order: 5 } }),
      item({ key: 'editor:siteInfo:contactModalSubtitle', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '请留下采购需求', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '说明文字', order: 1 } }),
      item({ key: 'editor:siteInfo:contact:email-item:label', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '业务邮箱', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '标签', order: 2 } }),
      item({ key: 'editor:siteInfo:contactModalTitle', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '联系我们', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '区块标题', order: 0 } }),
      item({ key: 'editor:siteInfo:contact:phone-item:label', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '联系电话', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '标签', order: 4 } }),
      item({ key: 'editor:siteInfo:contact:email-item:content', resourceType: 'editor', resourceId: 'siteInfo', sourceText: 'sales@example.com', meta: { pageId: 'siteInfo', componentName: '联系我们', fieldLabel: '内容', order: 3 } }),
      item({ key: 'editor:home:footer-1:social:linkedin:label', resourceType: 'editor', resourceId: 'footer-1', sourceText: '领英', meta: { pageId: 'home', pageName: '首页', componentId: 'footer-1', componentType: 'footer', componentName: '页脚', fieldLabel: '社交媒体名称', order: 300 } }),
    ],
    site: [],
    seo: [
      item({ key: 'seo:title', resourceType: 'seo', resourceId: 'global', sourceText: '官方站' }),
      item({ key: 'seo:description', resourceType: 'seo', resourceId: 'global', sourceText: '官方站描述' }),
      item({ key: 'seo:keywords', resourceType: 'seo', resourceId: 'global', sourceText: '采购,外贸' }),
    ],
    testimonial: [],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '站点设计', exact: true }).click();

  const contact = page.locator('article').filter({ has: page.getByRole('heading', { name: '联系我们', exact: true }) });
  await expect(contact.getByRole('heading', { name: '联系我们', exact: true })).toHaveCSS('font-weight', '400');
  await expect(contact.getByRole('heading', { name: '联系我们', exact: true })).toHaveCSS('color', 'rgb(124, 110, 245)');
  await expect(contact.getByText('区块标题', { exact: true })).toBeVisible();
  await expect(contact.getByText('说明文字', { exact: true })).toBeVisible();
  await expect(contact.getByText('标签', { exact: true })).toHaveCount(2);
  await expect(contact.getByText('内容', { exact: true })).toHaveCount(2);
  const orderedFields = [contact.getByText('区块标题', { exact: true }), contact.getByText('说明文字', { exact: true }), contact.getByText('标签', { exact: true }).first(), contact.getByText('内容', { exact: true }).first(), contact.getByText('标签', { exact: true }).last(), contact.getByText('内容', { exact: true }).last()];
  const positions = await Promise.all(orderedFields.map(field => field.boundingBox()));
  expect(positions.map(position => position!.y)).toEqual([...positions.map(position => position!.y)].sort((a, b) => a - b));
  await expect(contact.getByText('联信息与弹窗展示内容')).toHaveCount(0);

  const settings = page.locator('article').filter({ has: page.getByRole('heading', { name: '站点设置', exact: true }) });
  await expect(settings).toHaveCount(1);
  await expect(settings.getByRole('heading', { name: 'SEO 优化信息', exact: true })).toBeVisible();
  await expect(settings.getByRole('heading', { name: '社交媒体信息', exact: true })).toHaveCount(0);
  await expect(settings.getByText('SEO 标题', { exact: true })).toBeVisible();
  await expect(settings.getByText('SEO 描述', { exact: true })).toBeVisible();
  await expect(settings.getByText('SEO 关键词', { exact: true })).toBeVisible();
  await expect(settings.getByText('工作时间', { exact: true })).toHaveCount(0);
  await expect(settings.getByText('联系地址', { exact: true })).toHaveCount(0);
  const footer = page.locator('article').filter({ has: page.getByRole('heading', { name: '页脚', exact: true }) });
  await expect(footer.getByText('社交媒体名称', { exact: true })).toBeVisible();
  await expect(footer.getByRole('textbox', { name: '社交媒体名称中文原文', exact: true })).toHaveValue('领英');
  const sourceOrder = await settings.locator('input[readonly]').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  expect(sourceOrder).toEqual(['SEO 标题中文原文', 'SEO 描述中文原文', 'SEO 关键词中文原文']);
  await expect(page.getByText('站点名称等基础设置')).toHaveCount(0);
});

test('site design groups descriptor fields by page and component name', async ({ page }) => {
  const requestedTypes = await prepare(page, {
    editor: [
      item({ key: 'editor:home:hero-1:title', resourceType: 'editor', resourceId: 'hero-1', sourceText: '品牌主张', meta: { pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', fieldLabel: '主标题', order: 1 } }),
      item({ key: 'editor:home:hero-1:buttonText', resourceType: 'editor', resourceId: 'hero-1', sourceText: '查看产品', meta: { pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', fieldLabel: '主按钮', order: 2 } }),
      item({ key: 'editor:home:hero-1:trust:quality:title', resourceType: 'editor', resourceId: 'hero-1', sourceText: '品质保障', meta: { pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', fieldLabel: '服务承诺标题', order: 3 } }),
      item({ key: 'editor:home:hero-1:trust:quality:description', resourceType: 'editor', resourceId: 'hero-1', sourceText: '严格质检与稳定品质', meta: { pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', fieldLabel: '服务承诺说明', order: 4 } }),
    ],
    site: [], seo: [], testimonial: [],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '站点设计', exact: true }).click();

  await expect.poll(() => [...new Set(requestedTypes)].sort()).toEqual(['editor', 'product', 'seo', 'site']);
  expect(requestedTypes).not.toContain('testimonial');

  const component = page.locator('article').filter({ has: page.getByRole('heading', { name: '首屏横幅', exact: true }) });
  await expect(component).toHaveCount(1);
  await expect(component.getByText('主标题', { exact: true })).toBeVisible();
  await expect(component.getByText('主按钮', { exact: true })).toBeVisible();
  await expect(component.getByText('服务承诺标题', { exact: true })).toBeVisible();
  await expect(component.getByText('服务承诺说明', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '首页 / 首屏横幅', exact: true })).toHaveCount(0);
});

test('site design renders all header copy in one standalone header card', async ({ page }) => {
  await prepare(page, {
    editor: [
      item({ key: 'editor:home:hero-1:title', resourceType: 'editor', resourceId: 'hero-1', sourceText: '品牌主张', meta: { pageId: 'home', pageName: '首页', componentId: 'hero-1', componentType: 'hero', componentName: '首屏横幅', fieldLabel: '主标题', order: 100 } }),
      item({ key: 'editor:siteInfo:contactModalTitle', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '联系我们' }),
      item({ key: 'editor:home:header-1:eyebrow', resourceType: 'editor', resourceId: 'header-1', sourceText: '全球交付', meta: { pageId: 'home', pageName: '首页', componentId: 'header-1', componentType: 'header', componentName: '页头导航', fieldLabel: '眉标文案', order: 1 } }),
      item({ key: 'editor:home:header-1:title', resourceType: 'editor', resourceId: 'header-1', sourceText: '品牌名称', meta: { pageId: 'home', pageName: '首页', componentId: 'header-1', componentType: 'header', componentName: '页头导航', fieldLabel: '品牌名称', order: 2 } }),
      item({ key: 'editor:home:header-1:nav:nav-1:label', resourceType: 'editor', resourceId: 'header-1', sourceText: '产品中心', meta: { pageId: 'home', pageName: '首页', componentId: 'header-1', componentType: 'header', componentName: '页头导航', fieldLabel: '导航文案', order: 3 } }),
    ],
    site: [],
    seo: [], testimonial: [],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '站点设计', exact: true }).click();

  const header = page.locator('article').filter({ has: page.getByRole('heading', { name: '页头导航', exact: true }) });
  await expect(header).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '首页 / 页头导航', exact: true })).toHaveCount(0);
  for (const label of ['眉标文案', '品牌名称', '导航文案']) {
    await expect(header.getByText(label, { exact: true })).toBeVisible();
    await expect(header.getByRole('textbox', { name: `${label}中文原文`, exact: true })).toBeVisible();
    await expect(header.getByRole('textbox', { name: `${label}译文`, exact: true })).toBeVisible();
  }
  const hero = page.getByRole('heading', { name: '首屏横幅', exact: true });
  const contact = page.getByRole('heading', { name: '联系我们', exact: true });
  const settings = page.getByRole('heading', { name: '站点设置', exact: true });
  expect((await header.boundingBox())!.y).toBeLessThan((await hero.boundingBox())!.y);
  expect((await hero.boundingBox())!.y).toBeLessThan((await contact.boundingBox())!.y);
  expect((await contact.boundingBox())!.y).toBeLessThan((await settings.boundingBox())!.y);
});

test('site settings card remains visible before public Chinese content is configured', async ({ page }) => {
  await prepare(page, {
    editor: [
      item({ key: 'editor:siteInfo:contact:empty-item:label', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '' }),
      item({ key: 'editor:siteInfo:contact:empty-item:content', resourceType: 'editor', resourceId: 'siteInfo', sourceText: '' }),
    ],
    seo: [
      item({ key: 'seo:title', resourceType: 'seo', resourceId: 'global', sourceText: '' }),
      item({ key: 'seo:description', resourceType: 'seo', resourceId: 'global', sourceText: '' }),
      item({ key: 'seo:keywords', resourceType: 'seo', resourceId: 'global', sourceText: '' }),
    ],
    site: [],
    testimonial: [],
  });
  await page.goto('http://localhost:8088/storefront-translations');
  await page.getByRole('tab', { name: '站点设计', exact: true }).click();

  const settings = page.locator('article').filter({ has: page.getByRole('heading', { name: '站点设置', exact: true }) });
  await expect(settings).toHaveCount(1);
  const seoHeading = settings.getByRole('heading', { name: 'SEO 优化信息', exact: true });
  await expect(seoHeading).toBeVisible();
  await expect(settings.getByRole('heading', { name: '社交媒体信息', exact: true })).toHaveCount(0);
  await expect(settings.getByRole('textbox', { name: 'SEO 标题中文原文', exact: true })).toHaveValue('');
  await expect(settings.getByRole('textbox', { name: 'SEO 标题译文', exact: true })).toHaveValue('');
  await expect(settings.getByRole('textbox', { name: '联系地址中文原文', exact: true })).toHaveCount(0);
});
