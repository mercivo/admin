import { expect, test, type Page } from '@playwright/test';

const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:8088';

type TranslationItem = {
  key: string;
  resourceType: string;
  resourceId: string;
  sourceText: string;
  meta?: Record<string, unknown>;
  reuseGroupId?: string;
};

const item = (value: TranslationItem) => ({
  contentFormat: 'text', required: true, value: '', status: 'missing',
  updatedAt: '2026-10-15T00:00:00.000Z', ...value,
});

const prepare = async (page: Page, itemsByType: Record<string, ReturnType<typeof item>[]>) => {
  const requestedTypes: string[] = [];
  const contentTotal = Object.values(itemsByType).flat().length;
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) {
      return route.fulfill({ json: { data: { site: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    }
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'] } } });
    if (url.pathname.endsWith('/translations')) {
      const type = url.searchParams.get('resourceType') || '';
      const taskTab = url.searchParams.get('taskTab') || '';
      requestedTypes.push(taskTab || type);
      const keyword = (url.searchParams.get('keyword') || '').toLowerCase();
      const taskTypes: Record<string, string[]> = { product: ['product', 'category'], page: ['editor', 'site', 'seo'], common: ['system', 'constant'] };
      const all = taskTab ? (taskTypes[taskTab] || []).flatMap(resourceType => itemsByType[resourceType] || []) : itemsByType[type] || [];
      const items = keyword ? all.filter(entry => `${entry.key}\n${entry.sourceText}`.toLowerCase().includes(keyword)) : all;
      const groupKey = (entry: ReturnType<typeof item>) => {
        if (entry.resourceType === 'product') return `product:${entry.resourceId}`;
        if (entry.resourceType === 'category') return `category-level-${entry.meta?.level || 1}`;
        if (entry.resourceType === 'editor') return entry.resourceId === 'siteInfo'
          ? 'editor:siteInfo'
          : `editor:${entry.meta?.pageId || 'home'}:${entry.meta?.componentId || entry.resourceId}`;
        if (entry.resourceType === 'seo') return 'site-settings';
        if (entry.resourceType === 'system') return `system:${entry.meta?.section || entry.resourceId}`;
        return `${entry.resourceType}:${entry.resourceId}`;
      };
      const groupPage = Number(url.searchParams.get('groupPage') || 1);
      const groupPageSize = Number(url.searchParams.get('groupPageSize') || 10);
      const groupKeys = [...new Set(items.map(groupKey))];
      const selectedKeys = new Set(groupKeys.slice((groupPage - 1) * groupPageSize, groupPage * groupPageSize));
      const pagedItems = items.filter(entry => selectedKeys.has(groupKey(entry)));
      return route.fulfill({ json: { data: { items: pagedItems, total: items.length, page: 1, pageSize: 200, groupPage, groupPageSize, groupTotal: groupKeys.length, locale: 'en_US', summary: [{ locale: 'en_US', total: items.length, completed: 0, stale: 0, missing: items.length, percent: 0 }], contentSummary: [{ locale: 'en_US', total: contentTotal, completed: 0, stale: 0, missing: contentTotal, percent: 0 }] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  return requestedTypes;
};

test('translation loading states prevent empty content from flashing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations'] }));
  });
  let releaseSettings!: () => void;
  let releaseTranslations!: () => void;
  const settingsGate = new Promise<void>(resolve => { releaseSettings = resolve; });
  const translationsGate = new Promise<void>(resolve => { releaseTranslations = resolve; });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) {
      await settingsGate;
      return route.fulfill({ json: { data: { site: { name: '测试站点', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    }
    if (url.pathname.endsWith('/translations')) {
      await translationsGate;
      return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 200, locale: 'en_US', summary: [] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect(page.getByTestId('translations-settings-loading')).toBeVisible();
  await expect(page.getByText('尚未启用非中文语言', { exact: true })).toHaveCount(0);
  releaseSettings();
  await expect(page.getByTestId('translations-content-loading')).toBeVisible();
  await expect(page.getByText('暂无数据', { exact: true })).toHaveCount(0);
  releaseTranslations();
  await expect(page.getByTestId('translations-content-loading')).toHaveCount(0);
  await expect(page.locator('.ant-empty-description').getByText('暂无数据', { exact: true })).toBeVisible();
});

test('translation sidebar renders a skeleton whenever the content tab changes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations'] }));
  });
  let releasePageTab!: () => void;
  const pageTabGate = new Promise<void>(resolve => { releasePageTab = resolve; });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    if (url.pathname.endsWith('/translations')) {
      const taskTab = url.searchParams.get('taskTab');
      if (taskTab === 'page') await pageTabGate;
      const items = taskTab === 'product' ? [item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲' })] : [];
      return route.fulfill({ json: { data: { items, total: items.length, page: 1, pageSize: 200, locale: 'en_US', summary: [] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect(page.getByRole('button', { name: /商品甲/ }).first()).toBeVisible();
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();
  await expect(page.getByTestId('translations-content-loading')).toBeVisible();
  const sidebar = page.locator('section:has(.translation-tabs) aside');
  await expect(sidebar.locator('nav')).toBeHidden();
  expect(await sidebar.evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('translation-menu-skeleton');
  releasePageTab();
  await expect(page.getByTestId('translations-content-loading')).toHaveCount(0);
  await expect(sidebar.locator('nav')).toBeVisible();
});

test('each tab change requests exactly one business-group page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations'] }));
  });
  const requests: Array<{ tab: string; page: string; size: string }> = [];
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    if (url.pathname.endsWith('/translations')) {
      requests.push({ tab: url.searchParams.get('taskTab') || '', page: url.searchParams.get('groupPage') || '', size: url.searchParams.get('groupPageSize') || '' });
      return route.fulfill({ json: { data: { items: [], total: 0, page: 1, pageSize: 50, groupPage: 1, groupPageSize: 10, groupTotal: 0, locale: 'en_US', summary: [], contentSummary: [] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toEqual({ tab: 'product', page: '1', size: '10' });
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual({ tab: 'page', page: '1', size: '10' });
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(2);
});

test('translation empty-language state appears only after settings load and keeps a training-sized height', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations'] }));
  });
  let releaseSettings!: () => void;
  const settingsGate = new Promise<void>(resolve => { releaseSettings = resolve; });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) {
      await settingsGate;
      return route.fulfill({ json: { data: { site: { name: '测试站点', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'] } } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect(page.getByTestId('translations-settings-loading')).toBeVisible();
  await expect(page.getByText('尚未启用非中文语言', { exact: true })).toHaveCount(0);
  releaseSettings();
  const emptyState = page.getByTestId('translations-empty-languages');
  await expect(emptyState).toBeVisible();
  expect((await emptyState.boundingBox())!.height).toBeGreaterThanOrEqual(384);
});

test('keyword matches keep their business context', async ({ page }) => {
  await prepare(page, {
    product: [
      item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲', meta: { sku: 'SKU-1' } }),
      item({ key: 'product:p2:name', resourceType: 'product', resourceId: 'p2', sourceText: '商品乙', meta: { sku: 'SKU-2' } }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect(page.locator('article')).toHaveCount(2);
  await page.getByPlaceholder('搜索中文原文、译文、业务对象或稳定键').fill('商品');
  await expect(page.getByRole('heading', { name: '搜索结果', exact: true })).toHaveCount(0);
  await expect(page.locator('article')).toHaveCount(2);
});

test('identical source copy renders and edits as independent translation fields', async ({ page }) => {
  await prepare(page, {
    product: [
      item({ key: 'product:p1:variant:v1:specification', resourceType: 'product', resourceId: 'p1', sourceText: '颜色', reuseGroupId: 'legacy-shared-group' }),
      item({ key: 'product:p1:variant:v2:specification', resourceType: 'product', resourceId: 'p1', sourceText: '颜色', reuseGroupId: 'legacy-shared-group' }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);

  const translations = page.getByRole('textbox', { name: '规格名称译文' });
  await expect(translations).toHaveCount(2);
  await translations.nth(0).fill('Color A');
  await expect(translations.nth(0)).toHaveValue('Color A');
  await expect(translations.nth(1)).toHaveValue('');
  await expect(page.getByText(/应用于 \d+ 处/)).toHaveCount(0);
  await expect(page.getByText('译文不一致', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '保存 (1)', exact: true })).toBeEnabled();
});

test('fields follow business rendering order instead of API response order in every tab', async ({ page }) => {
  await prepare(page, {
    product: [
      item({ key: 'product:p1:variant:v2:option', resourceType: 'product', resourceId: 'p1', sourceText: '蓝色', meta: { sku: 'SKU-1', order: 103 } }),
      item({ key: 'product:p1:description', resourceType: 'product', resourceId: 'p1', sourceText: '商品内容', meta: { sku: 'SKU-1', order: 1 } }),
      item({ key: 'product:p1:variant:v1:specification', resourceType: 'product', resourceId: 'p1', sourceText: '尺寸', meta: { sku: 'SKU-1', order: 100 } }),
      item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品名称', meta: { sku: 'SKU-1', order: 0 } }),
      item({ key: 'product:p1:variant:v2:specification', resourceType: 'product', resourceId: 'p1', sourceText: '颜色', meta: { sku: 'SKU-1', order: 102 } }),
      item({ key: 'product:p1:variant:v1:option', resourceType: 'product', resourceId: 'p1', sourceText: '大号', meta: { sku: 'SKU-1', order: 101 } }),
    ],
    editor: [
      item({ key: 'editor:home:hero-1:subtitle', resourceType: 'editor', resourceId: 'hero-1', sourceText: '模块内容', meta: { pageId: 'home', componentId: 'hero-1', componentName: '首屏横幅', fieldLabel: '说明文字', order: 2 } }),
      item({ key: 'editor:home:hero-1:title', resourceType: 'editor', resourceId: 'hero-1', sourceText: '模块名称', meta: { pageId: 'home', componentId: 'hero-1', componentName: '首屏横幅', fieldLabel: '主标题', order: 1 } }),
    ],
    system: [
      item({ key: 'system:empty.contactInformation', resourceType: 'system', resourceId: 'storefront', sourceText: '暂无联系信息' }),
      item({ key: 'system:empty.products', resourceType: 'system', resourceId: 'storefront', sourceText: '当前分类暂无商品' }),
      item({ key: 'system:empty.categories', resourceType: 'system', resourceId: 'storefront', sourceText: '暂无分类' }),
    ],
  });
  const sources = () => page.locator('article input[readonly]').evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect.poll(sources).toEqual(['商品名称', '商品内容', '尺寸', '大号', '颜色', '蓝色']);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();
  await expect.poll(sources).toEqual(['模块名称', '模块内容']);
  await page.getByRole('tab', { name: '公共文案', exact: true }).click();
  await expect.poll(sources).toEqual(['当前分类暂无商品', '暂无分类', '暂无联系信息']);
});

test('public API errors use readable field labels instead of split error-code letters', async ({ page }) => {
  await prepare(page, {
    system: [
      item({ key: 'system:apiErrors.SITE_NOT_FOUND_OR_UNPUBLISHED', resourceType: 'system', resourceId: 'storefront', sourceText: '站点不存在或尚未发布。' }),
      item({ key: 'system:apiErrors.NETWORK_ERROR', resourceType: 'system', resourceId: 'storefront', sourceText: '网络连接异常，请稍后重试。' }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '公共文案', exact: true }).click();

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
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '公共文案', exact: true }).click();
  const emptyCopy = page.locator('article').filter({ has: page.getByRole('heading', { name: '空数据文案', exact: true }) });
  await expect(emptyCopy.getByText('联系信息空数据', { exact: true })).toBeVisible();
  await expect(emptyCopy.getByRole('textbox', { name: '联系信息空数据中文原文' })).toHaveValue('暂无联系信息');
});

test('guest access disabled copy is configurable in the system copy tab', async ({ page }) => {
  await prepare(page, {
    system: [
      item({ key: 'system:guestAccess.disabledTitle', resourceType: 'system', resourceId: 'storefront', sourceText: '暂不开放游客访问' }),
      item({ key: 'system:guestAccess.disabledDescription', resourceType: 'system', resourceId: 'storefront', sourceText: '当前站点仅对授权客户开放，请联系站点管理员获取访问权限。' }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '公共文案', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: '游客访问提示', exact: true }) });
  await expect(card.getByText('游客禁止访问标题', { exact: true })).toBeVisible();
  await expect(card.getByText('游客禁止访问说明', { exact: true })).toBeVisible();
});

test('site access notices are configurable in their own public-copy group', async ({ page }) => {
  await prepare(page, {
    system: [
      item({ key: 'system:siteAccess.planExpiredTitle', resourceType: 'system', resourceId: 'storefront', sourceText: '站点暂时无法访问', meta: { section: 'siteAccess' } }),
      item({ key: 'system:siteAccess.planExpiredDescription', resourceType: 'system', resourceId: 'storefront', sourceText: '当前租户套餐已过期，请联系站点管理员续费后再访问。', meta: { section: 'siteAccess' } }),
      item({ key: 'system:siteAccess.publishPermissionTitle', resourceType: 'system', resourceId: 'storefront', sourceText: '站点暂时无法访问', meta: { section: 'siteAccess' } }),
      item({ key: 'system:siteAccess.publishPermissionDescription', resourceType: 'system', resourceId: 'storefront', sourceText: '当前租户没有独立站发布权限，请联系站点管理员升级套餐后再访问。', meta: { section: 'siteAccess' } }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '公共文案', exact: true }).click();
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: '站点访问提示', exact: true }) });
  await expect(card.getByText('套餐过期标题', { exact: true })).toBeVisible();
  await expect(card.getByText('无发布权限说明', { exact: true })).toBeVisible();
});

test('category levels use Chinese numerals without card descriptions', async ({ page }) => {
  await prepare(page, {
    category: [
      item({ key: 'category:c1:label', resourceType: 'category', resourceId: 'c1', sourceText: '箱包', meta: { level: 1, sort: 1, path: ['箱包'] } }),
      item({ key: 'category:c2:label', resourceType: 'category', resourceId: 'c2', sourceText: '手提包', meta: { level: 2, sort: 1, path: ['箱包', '手提包'] } }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '商品内容', exact: true }).click();
  await expect(page.getByRole('heading', { name: '一级分类', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '二级分类', exact: true })).toBeVisible();
  await expect(page.getByText(/汇总维护全部/)).toHaveCount(0);
});

test('product tab quick navigation lists category levels before product cards', async ({ page }) => {
  await prepare(page, {
    product: [
      item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲', meta: { sku: 'SKU-1', order: 0 } }),
    ],
    category: [
      item({ key: 'category:c2:label', resourceType: 'category', resourceId: 'c2', sourceText: '手提包', meta: { level: 2, sort: 1, path: ['箱包', '手提包'] } }),
      item({ key: 'category:c1:label', resourceType: 'category', resourceId: 'c1', sourceText: '箱包', meta: { level: 1, sort: 1, path: ['箱包'] } }),
    ],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);

  const navigationItems = page.locator('section:has(.translation-tabs) aside nav button');
  await expect(navigationItems).toHaveCount(3);
  await expect(navigationItems.nth(0)).toContainText('一级分类');
  await expect(navigationItems.nth(1)).toContainText('二级分类');
  await expect(navigationItems.nth(2)).toContainText('商品甲');
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
      item({ key: 'editor:home:footer-1:copyrightText', resourceType: 'editor', resourceId: 'footer-1', sourceText: '版权所有', meta: { pageId: 'home', pageName: '首页', componentId: 'footer-1', componentType: 'footer', componentName: '页脚', fieldLabel: '版权信息', order: 301 } }),
    ],
    site: [],
    seo: [
      item({ key: 'seo:title', resourceType: 'seo', resourceId: 'global', sourceText: '官方站' }),
      item({ key: 'seo:description', resourceType: 'seo', resourceId: 'global', sourceText: '官方站描述' }),
      item({ key: 'seo:keywords', resourceType: 'seo', resourceId: 'global', sourceText: '采购,外贸' }),
    ],
    testimonial: [],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();

  const contact = page.locator('article').filter({ has: page.getByRole('heading', { name: '联系我们', exact: true }) });
  await expect(contact.getByRole('heading', { name: '联系我们', exact: true })).toBeVisible();
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
  await expect(settings.getByRole('heading', { name: '社交媒体信息', exact: true })).toHaveCount(0);
  await expect(settings.getByText('SEO 标题', { exact: true })).toBeVisible();
  await expect(settings.getByText('SEO 描述', { exact: true })).toBeVisible();
  await expect(settings.getByText('SEO 关键词', { exact: true })).toBeVisible();
  await expect(settings.getByText('工作时间', { exact: true })).toHaveCount(0);
  await expect(settings.getByText('联系地址', { exact: true })).toHaveCount(0);
  const footer = page.locator('article').filter({ has: page.getByRole('heading', { name: '页脚', exact: true }) });
  await expect(footer.getByText('社交媒体名称', { exact: true })).toBeVisible();
  await expect(footer.getByRole('textbox', { name: '社交媒体名称中文原文', exact: true })).toHaveValue('领英');
  await expect(footer.getByText('版权信息', { exact: true })).toBeVisible();
  await expect(footer.getByRole('textbox', { name: '版权信息中文原文', exact: true })).toHaveValue('版权所有');
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
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();

  await expect.poll(() => [...new Set(requestedTypes)].sort()).toEqual(['page', 'product']);
  expect(requestedTypes).not.toContain('testimonial');

  const component = page.locator('article').filter({ has: page.getByRole('heading', { name: '首屏横幅', exact: true }) });
  await expect(component).toHaveCount(1);
  await expect(component.getByText('主标题', { exact: true })).toBeVisible();
  await expect(component.getByText('主按钮', { exact: true })).toBeVisible();
  await expect(component.getByText('服务承诺标题', { exact: true })).toBeVisible();
  await expect(component.getByText('服务承诺说明', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '首页 / 首屏横幅', exact: true })).toHaveCount(0);
});

test('site design groups fixed product detail copy in one standalone card', async ({ page }) => {
  const fields = [
    ['home', '面包屑首页', '首页'],
    ['likes', '点赞数后缀', '人喜欢'],
    ['contactForPrice', '隐藏价格文案', '价格请咨询'],
    ['contactNote', '报价说明', '联系我们获取报价、定制方案与交付信息。'],
    ['specifications', '规格标题', '商品规格'],
    ['descriptionEyebrow', '描述眉标', 'PRODUCT DETAILS'],
    ['descriptionTitle', '描述标题', '商品详情'],
    ['notFoundTitle', '商品不存在标题', '商品不存在或已下架'],
    ['notFoundDescription', '商品不存在说明', '该商品暂时无法查看，请返回首页浏览其他商品。'],
    ['backHome', '返回首页按钮', '返回首页'],
  ];
  await prepare(page, {
    editor: fields.map(([key, fieldLabel, sourceText], order) => item({
      key: `editor:product:product-detail:${key}`,
      resourceType: 'editor',
      resourceId: 'product-detail',
      sourceText,
      meta: { pageId: 'product', pageName: '商品详情页', componentId: 'product-detail', componentType: 'productDetail', componentName: '商品详情', fieldLabel, order },
    })),
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();

  const detail = page.locator('article').filter({ has: page.getByRole('heading', { name: '商品详情', exact: true }) });
  await expect(detail).toHaveCount(1);
  await expect(detail.getByText('10 个字段', { exact: true })).toBeVisible();
  for (const [, fieldLabel, sourceText] of fields) {
    await expect(detail.getByText(fieldLabel, { exact: true })).toBeVisible();
    await expect(detail.getByRole('textbox', { name: `${fieldLabel}中文原文`, exact: true })).toHaveValue(sourceText);
  }
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
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();

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
  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await page.getByRole('tab', { name: '页面内容', exact: true }).click();

  const settings = page.locator('article').filter({ has: page.getByRole('heading', { name: '站点设置', exact: true }) });
  await expect(settings).toHaveCount(1);
  await expect(settings.getByRole('heading', { name: '社交媒体信息', exact: true })).toHaveCount(0);
  await expect(settings.getByRole('textbox', { name: 'SEO 标题中文原文', exact: true })).toHaveValue('');
  await expect(settings.getByRole('textbox', { name: 'SEO 标题译文', exact: true })).toHaveValue('');
  await expect(settings.getByRole('textbox', { name: '联系地址中文原文', exact: true })).toHaveCount(0);
});

test('keeps the classic field card and sticky quick navigation while using all-content progress', async ({ page }) => {
  await prepare(page, {
    product: [item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲', meta: { sku: 'SKU-1' } })],
    system: [item({ key: 'system:empty.products', resourceType: 'system', resourceId: 'storefront', sourceText: '当前分类暂无商品' })],
  });
  await page.goto(`${frontendBaseUrl}/storefront-translations`);

  await expect(page.getByText('0 / 2', { exact: true })).toBeVisible();
  await expect(page.getByText('(product:p1:name)', { exact: true })).toBeVisible();
  await expect(page.getByText('查看技术信息', { exact: true })).toHaveCount(0);
  await expect(page.getByText('使用位置：', { exact: false })).toHaveCount(0);
  await expect(page.getByText('仅必填项', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '展开全部', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '收起全部', exact: true })).toHaveCount(0);
  await expect(page.locator('aside').filter({ hasText: '快速定位' })).toHaveCSS('position', 'sticky');
});

test('keeps only export, import and save actions and preserves their workflows', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'] }));
  });
  const requests: Array<{ method: string; pathname: string; search: string; body?: unknown }> = [];
  let savedValue = '';
  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'] } } });
    if (url.pathname.endsWith('/workspace/settings')) return route.fulfill({ json: { data: { site: { name: '测试站点', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    if (url.pathname.endsWith('/translations/export/en_US')) {
      requests.push({ method: request.method(), pathname: url.pathname, search: url.search });
      return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: 'excel-content' });
    }
    if (url.pathname.endsWith('/translations/import/en_US/preview')) {
      requests.push({ method: request.method(), pathname: url.pathname, search: url.search });
      return route.fulfill({ json: { data: { token: 'preview-token', expiresAt: '2026-10-20T12:00:00.000Z', summary: { total: 1, ready: 1, unchanged: 0, blank: 0, sourceChanged: 0, removed: 0, duplicate: 0, invalid: 0, addedSinceExport: 0 }, rows: [{ row: 2, unitId: 'unit-1', key: 'product:p1:name', sourceText: '商品甲', value: 'Product A', status: 'ready', reason: '可导入' }] } } });
    }
    if (url.pathname.endsWith('/translations/import/en_US/commit')) {
      requests.push({ method: request.method(), pathname: url.pathname, search: url.search, body: request.postDataJSON() });
      return route.fulfill({ json: { data: { imported: 1, unchanged: 0, blankSkipped: 0, staleSkipped: 0, invalidSkipped: 0 } } });
    }
    if (url.pathname.endsWith('/translations') && request.method() === 'PUT') {
      const body = request.postDataJSON();
      requests.push({ method: request.method(), pathname: url.pathname, search: url.search, body });
      savedValue = body.items[0].value;
      return route.fulfill({ json: { data: {} } });
    }
    if (url.pathname.endsWith('/translations')) {
      const translation = item({ key: 'product:p1:name', resourceType: 'product', resourceId: 'p1', sourceText: '商品甲', meta: { sku: 'SKU-1' } });
      translation.value = savedValue;
      translation.status = savedValue ? 'completed' : 'missing';
      return route.fulfill({ json: { data: { items: [translation], total: 1, page: 1, pageSize: 200, locale: 'en_US', summary: [{ locale: 'en_US', total: 1, completed: savedValue ? 1 : 0, stale: 0, missing: savedValue ? 0 : 1, percent: savedValue ? 100 : 0 }] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${frontendBaseUrl}/storefront-translations`);
  await expect(page.getByLabel('导出范围')).toHaveCount(0);
  await expect(page.getByText('导出全部', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出 Excel', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入 Excel', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^保存/ })).toBeDisabled();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 Excel', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^测试站点-多语言-en_US-\d{12}\.xlsx$/);
  expect(requests.find(entry => entry.pathname.endsWith('/translations/export/en_US'))?.search).toBe('');

  await page.locator('input[type="file"]').setInputFiles({ name: 'translations.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('excel-content') });
  await expect(page.getByText('多语言 Excel 导入预检', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '确认导入', exact: true }).click();
  await expect(page.getByText('成功导入 1 条', { exact: false })).toBeVisible();
  expect(requests.find(entry => entry.pathname.endsWith('/commit'))?.body).toEqual({ token: 'preview-token' });

  await page.getByRole('textbox', { name: '商品名称译文', exact: true }).fill('Product A');
  await page.getByRole('button', { name: '保存 (1)', exact: true }).click();
  await expect(page.getByText('已保存 1 条译文', { exact: true })).toBeVisible();
  expect(requests.find(entry => entry.method === 'PUT')?.body).toEqual({ locale: 'en_US', items: [{ key: 'product:p1:name', value: 'Product A' }] });
});
