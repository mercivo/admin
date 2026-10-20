import { expect, test, type Page } from '@playwright/test';

const permissions = [
  'group.site', 'menu.site', 'menu.storefront.settings', 'menu.storefront.releases',
  'page.site.editor', 'page.site.settings', 'page.storefront.releases',
  'site.edit', 'site.publish', 'settings.site', 'site.domain',
];

const workspace = {
  account: { enterpriseName: '测试企业', phone: '13800000000', email: '', timezone: 'Asia/Shanghai', role: 'admin', joinedAt: '2026-01-01' },
  site: { id: 'site-1', slug: 'test-site', name: '测试独立站', description: '外贸 ERP 与独立站平台', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'], defaultCurrency: 'CNY', domain: '', domainStatus: 'pending', status: 'draft' },
  billing: { plan: 'ERP 专业版', status: 'active', expiresAt: null, limits: { products: 100, members: 10, warehouses: 5 }, usage: { products: 0, members: 1, warehouses: 1 }, sitePublishing: true, features: {}, permissions },
};
const defaultSiteInfoForTest = {
  contactModalTitle: '联系我们',
  contactModalSubtitle: '联系说明',
  contactDetails: { email: '', phone: '', whatsapp: '', address: '', hours: '' },
  contactItems: [],
  socialLinks: [
    { id: 'social-1', platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.example', visible: true },
    { id: 'social-2', platform: 'facebook', label: 'Facebook', url: 'https://facebook.example', visible: true },
    { id: 'social-3', platform: 'instagram', label: 'Instagram', url: 'https://instagram.example', visible: true },
  ],
};

async function authenticate(page: Page) {
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'storefront-release-e2e');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: value }));
  }, permissions);
}

async function rendererSignature(page: Page) {
  return page.locator('.site-renderer-root').evaluate(root => Array.from(root.querySelectorAll<HTMLElement>(':scope > section')).map(section => {
    const style = getComputedStyle(section);
    const content = section.firstElementChild as HTMLElement | null;
    const contentStyle = content ? getComputedStyle(content) : null;
    return {
      type: section.dataset.sectionType,
      display: style.display,
      backgroundColor: style.backgroundColor,
      color: style.color,
      contentDisplay: contentStyle?.display || '',
      contentPadding: contentStyle ? [contentStyle.paddingTop, contentStyle.paddingRight, contentStyle.paddingBottom, contentStyle.paddingLeft] : [],
      contentGrid: contentStyle?.gridTemplateColumns || '',
      contentMinHeight: contentStyle?.minHeight || '',
    };
  }));
}

async function contactModalSignature(page: Page) {
  const dialog = page.getByRole('dialog');
  return dialog.evaluate(element => {
    const shell = element.closest('.ant-modal') as HTMLElement;
    const content = shell.querySelector<HTMLElement>('.ant-modal-content')!;
    const body = shell.querySelector<HTMLElement>('.ant-modal-body')!;
    const note = shell.querySelector<HTMLElement>('.editor-contact-preview-note')!;
    const card = shell.querySelector<HTMLElement>('.editor-contact-preview-item')!;
    const styles = [shell, content, body, note, card].map(node => {
      const style = getComputedStyle(node);
      return { width: style.width, padding: style.padding, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor, fontSize: style.fontSize, lineHeight: style.lineHeight };
    });
    return { shellClass: Array.from(shell.classList).filter(name => name === 'ant-modal' || name === 'app-modal'), bodyClass: body.className, styles };
  });
}

test('site settings cards share height and use the default site description', async ({ page }) => {
  await authenticate(page);
  let savedEditorPayload: any;
  let savedSitePayload: any;
  let logoUploadCount = 0;
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/workspace/settings/site-contact') && route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      savedEditorPayload = { value: { siteInfo: body.value } };
      return route.fulfill({ json: { data: body.value } });
    }
    if (url.includes('/workspace/settings/site-contact')) return route.fulfill({ json: { data: defaultSiteInfoForTest } });
    if (url.includes('/workspace/settings/site') && route.request().method() === 'PUT') {
      savedSitePayload = route.request().postDataJSON();
      return route.fulfill({ json: { data: savedSitePayload } });
    }
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: workspace } });
    if (url.includes('/workspace/config/seo')) return route.fulfill({ json: { data: { title: '', description: '', keywords: '' } } });
    if (url.includes('/workspace/config/siteEditor') && route.request().method() === 'PUT') {
      savedEditorPayload = route.request().postDataJSON();
      return route.fulfill({ json: { data: savedEditorPayload.value } });
    }
    if (url.includes('/workspace/config/siteEditor')) return route.fulfill({ json: { data: { status: 'draft', version: 1, pages: {}, siteInfo: defaultSiteInfoForTest } } });
    if (url.includes('/product/site-logo') && route.request().method() === 'POST') { logoUploadCount += 1; return route.fulfill({ json: { data: { url: '/uploads/brand-logo.png', objectName: 'brand-logo.png' } } }); }
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/storefront/settings`);
  await expect(page.getByRole('heading', { name: '站点设置', exact: true })).toBeVisible();
  await expect(page.getByText('语言编码已与 Ant Design Locale 对齐')).toHaveCount(0);
  const siteDescription = page.getByRole('textbox', { name: '站点描述' });
  await expect(siteDescription).toHaveValue('外贸 ERP 与独立站平台');
  await expect(siteDescription).toHaveJSProperty('tagName', 'INPUT');
  await expect(page.getByRole('heading', { name: '多语言配置', exact: true })).toBeVisible();
  const languageSearchBox = await page.getByTestId('language-search-container').boundingBox();
  const languageTableBox = await page.getByTestId('language-table').boundingBox();
  expect(languageSearchBox!.y).toBeLessThan(languageTableBox!.y);
  expect(languageTableBox!.y - (languageSearchBox!.y + languageSearchBox!.height)).toBe(12);
  await expect(page.getByText('英语统一使用 en_US')).toHaveCount(0);
  await expect(page.getByTestId('selected-language-row')).toHaveCount(2);
  await expect(page.getByRole('radio', { name: '设 zh_CN 为默认语言' })).toBeChecked();
  const addLanguage = page.getByRole('combobox', { name: '添加支持语言' });
  await addLanguage.click();
  await addLanguage.fill('en_');
  await expect(page.locator('.ant-select-item-option').filter({ hasText: 'en_GB' })).toHaveCount(0);
  await addLanguage.fill('zh_');
  await expect(page.locator('.ant-select-item-option').filter({ hasText: 'zh_HK' })).toHaveCount(0);
  await addLanguage.fill('fr_FR');
  await expect(page.locator('.ant-select-item-option').filter({ hasText: 'fr_FR' })).toBeVisible();
  await page.locator('.ant-select-item-option').filter({ hasText: 'fr_FR' }).click();
  await expect.poll(() => savedSitePayload?.supportedLanguages).toEqual(['zh_CN', 'en_US', 'fr_FR']);
  expect(savedSitePayload.defaultLanguage).toBe('zh_CN');
  await expect(page.getByRole('button', { name: '删除语言 zh_CN' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '删除语言 zh_CN' })).toHaveAttribute('title', '默认语言不可删除');
  await page.getByRole('button', { name: '删除语言 en_US' }).click();
  await expect.poll(() => savedSitePayload?.supportedLanguages).toEqual(['zh_CN', 'fr_FR']);
  expect(savedSitePayload.defaultLanguage).toBe('zh_CN');
  await page.getByRole('radio', { name: '设 fr_FR 为默认语言' }).check();
  await expect.poll(() => savedSitePayload?.defaultLanguage).toBe('fr_FR');
  await expect(page.getByRole('button', { name: '删除语言 fr_FR' })).toBeDisabled();
  await page.getByRole('button', { name: '删除语言 zh_CN' }).click();
  await expect.poll(() => savedSitePayload?.supportedLanguages).toEqual(['fr_FR']);
  expect(savedSitePayload.defaultLanguage).toBe('fr_FR');
  await expect(page.getByRole('button', { name: '删除语言 fr_FR' })).toBeDisabled();
  const logoInput = page.locator('.ant-upload input[type="file"]');
  await logoInput.setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(500 * 1024 + 1) });
  await expect(page.getByText('Logo 图片不能超过 500KB')).toBeVisible();
  expect(logoUploadCount).toBe(0);
  await logoInput.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('logo') });
  await expect(page.getByRole('img', { name: '品牌 Logo' })).toHaveAttribute('src', '/uploads/brand-logo.png');
  expect(logoUploadCount).toBe(1);
  await expect.poll(() => savedSitePayload?.logoUrl).toBe('/uploads/brand-logo.png');
  const cards = page.locator('main section').filter({ has: page.locator('h2') });
  const siteBox = await cards.filter({ hasText: '站点信息' }).boundingBox();
  const seoBox = await cards.filter({ hasText: 'SEO 优化' }).boundingBox();
  expect(siteBox).not.toBeNull();
  expect(seoBox).not.toBeNull();
  expect(Math.abs(siteBox!.height - seoBox!.height)).toBeLessThan(2);
  const descriptions = page.locator('.storefront-settings-card textarea');
  await expect(descriptions).toHaveCount(1);
  expect(await descriptions.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(96);
  expect(await descriptions.evaluate(element => getComputedStyle(element).resize)).toBe('none');
  const siteLabels = await cards.filter({ hasText: '站点信息' }).locator('[data-settings-label]').evaluateAll(elements => elements.map(element => ({ fontSize: getComputedStyle(element).fontSize, fontWeight: getComputedStyle(element).fontWeight, color: getComputedStyle(element).color })));
  const seoLabels = await cards.filter({ hasText: 'SEO 优化' }).locator('[data-settings-label]').evaluateAll(elements => elements.map(element => ({ fontSize: getComputedStyle(element).fontSize, fontWeight: getComputedStyle(element).fontWeight, color: getComputedStyle(element).color })));
  expect(new Set([...siteLabels, ...seoLabels].map(style => JSON.stringify(style))).size).toBe(1);
  await expect(page.getByText('社交媒体', { exact: true })).toHaveCount(0);
  await expect(page.getByText('联系信息与社交媒体', { exact: true })).toHaveCount(0);
  await expect(page.getByText('区块标题', { exact: true })).toHaveCount(0);
  await expect(page.getByText('说明文字', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('primary-contact-row')).toHaveCount(0);
  await expect(page.getByTestId('secondary-contact-row')).toHaveCount(0);
  const placeholderMismatches = await page.locator('[data-settings-field]').evaluateAll(fields => fields.flatMap(field => {
    const label = field.querySelector('[data-settings-label]')?.textContent?.trim();
    return Array.from(field.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]')).filter(control => control.placeholder !== label).map(control => ({ label, placeholder: control.placeholder }));
  }));
  expect(placeholderMismatches).toEqual([]);
});

test('site settings keeps all modules in loading state until settings data is ready', async ({ page }) => {
  await authenticate(page);
  let releaseData!: () => void;
  const dataGate = new Promise<void>(resolve => { releaseData = resolve; });
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/workspace/settings') || url.includes('/workspace/config/seo')) {
      await dataGate;
      if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: workspace } });
      return route.fulfill({ json: { data: { title: 'SEO 标题', description: 'SEO 描述', keywords: '关键词' } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/storefront/settings`);
  await expect(page.getByTestId('storefront-settings-loading')).toBeVisible();
  await expect(page.getByTestId('storefront-settings-loading').locator('section')).toHaveCount(4);
  await expect(page.getByRole('heading', { name: '站点信息', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '多语言配置', exact: true })).toHaveCount(0);
  releaseData();
  await expect(page.getByTestId('storefront-settings-loading')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '站点信息', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'SEO 标题' })).toHaveValue('SEO 标题');
  await expect(page.getByRole('heading', { name: '多语言配置', exact: true })).toBeVisible();
});

test('site editor shows identity and requires a release note before publishing', async ({ page }) => {
  await authenticate(page);
  let publishPayload: unknown;
  let savedEditorPayload: any;
  let productPoolRequestUrl = '';
  let mobileEditorRendererSignature: Awaited<ReturnType<typeof rendererSignature>>;
  const productPoolItems = [
    { id: 'pool-1', nameZh: '商品池长名称产品用于验证两行对齐', sku: 'POOL-1', price: '¥99', stock: 12, moq: 10, status: 'published', category: 'bags', img: '', description: '<p>三行以内的商品说明</p>', hot: false, badge: 'new', tags: ['定制'] },
    { id: 'pool-2', nameZh: '无标签产品', sku: 'POOL-2', price: '¥199', stock: 3, moq: 20, status: 'published', category: 'bags', img: '', description: '', hot: true, tags: [] },
    ...Array.from({ length: 9 }, (_, index) => ({ id: `pool-${index + 3}`, nameZh: `分页商品 ${index + 3}`, sku: `POOL-${index + 3}`, price: '¥299', stock: 20, moq: 5, status: 'published', category: 'bags', img: '', description: '<p>第一行说明</p><p>第二行说明</p><p>第三行说明</p><p>不应完整显示的第四行说明</p>', hot: false, tags: [] })),
  ];
  const productPoolCategories = [
    { code: 'bags', label: '超长的箱包产品分类名称用于验证省略号显示而不换行', sort: 1, status: 'enabled', remark: '', children: [{ code: 'backpacks', label: '背包', sort: 1, status: 'enabled', remark: '' }] },
    { code: 'empty', label: '空分类', sort: 2, status: 'enabled', remark: '', children: [] },
  ];
  await page.context().route('**/api/v1/**', route => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/public/site')) return route.fulfill({ json: { data: {
      siteId: 'site-1', versionId: 'version-2', version: 2,
      site: { ...workspace.site, status: 'published', currencySymbol: '¥' },
      config: savedEditorPayload?.value || {}, products: productPoolItems,
      categories: [{ code: 'bags', label: productPoolCategories[0].label, parentCode: null, sort: 1 }, { code: 'backpacks', label: '背包', parentCode: 'bags', sort: 1 }, { code: 'empty', label: '空分类', parentCode: null, sort: 2 }],
      i18n: { sourceLocale: 'zh_CN', locales: ['zh_CN'], messages: { zh_CN: {} } },
    } } });
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: publishPayload ? { ...workspace, site: { ...workspace.site, status: 'published', domain: 'tenant.localhost', domainStatus: 'active' } } : workspace } });
    if (url.includes('/workspace/config/siteEditor') && method === 'GET') return route.fulfill({ json: { data: savedEditorPayload?.value || {} } });
    if (url.includes('/workspace/config/currency')) return route.fulfill({ json: { data: {} } });
    if (url.endsWith('/admin/sites')) return route.fulfill({ json: { data: [{ ...workspace.site, supportedLanguages: ['zh_CN', 'en_US', 'fr_FR'] }] } });
    if (url.includes('/storefront/product-pool')) {
      productPoolRequestUrl = url;
      return route.fulfill({ json: { data: {
        items: productPoolItems,
        total: 11, page: 1, pageSize: 50, categoryCounts: { bags: 11 },
        categories: productPoolCategories,
        summary: { totalProducts: 11 },
      } } });
    }
    if (url.includes('/admin/sites/site-1/publish') && method === 'POST') {
      publishPayload = route.request().postDataJSON();
      return route.fulfill({ json: { data: { id: 'version-2', siteId: 'site-1', version: 2, releaseNote: '首页升级', publishedBy: 'tester', publishedAt: '2026-10-14T08:00:00.000Z' } } });
    }
    if (url.includes('/workspace/config/siteEditor') && method === 'PUT') {
      savedEditorPayload = route.request().postDataJSON();
      return route.fulfill({ json: { data: savedEditorPayload.value || {} } });
    }
    if (url.includes('/workspace/config/') && method === 'PUT') return route.fulfill({ json: { data: route.request().postDataJSON()?.value || {} } });
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/site-editor`);
  await expect(page.getByRole('link', { name: '站点设计' })).toBeVisible();
  await expect(page.getByRole('button', { name: '站点预览' })).toBeVisible();
  const actionLabels = await page.locator('.editor-toolbar-button, .editor-toolbar-button-primary').allTextContents();
  expect(actionLabels.slice(-4)).toEqual(['保存草稿', '站点预览', '查看已发布站点', '发布站点']);
  await expect(page.getByRole('button', { name: '保存草稿' })).toHaveCSS('font-weight', '400');
  await expect(page.getByRole('button', { name: '站点预览' })).toHaveCSS('font-weight', '400');
  await expect(page.getByRole('button', { name: '查看已发布站点' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '发布站点', exact: true })).toHaveCSS('font-weight', '400');
  await expect(page.getByText('内容结构', { exact: true })).toHaveCount(0);
  await expect(page.getByText('编辑当前区块的内容、样式与交互', { exact: true })).toHaveCount(0);
  const rightTabs = page.locator('.editor-right-tabs button');
  await expect(rightTabs).toHaveCount(3);
  await expect(page.locator('.editor-right-tabs-wrapper')).toHaveCSS('border-bottom-style', 'solid');
  const tabDividerBox = await page.locator('.editor-right-tabs-wrapper').boundingBox();
  const inspectorScrollBox = await page.locator('.editor-inspector-scroll').boundingBox();
  expect(inspectorScrollBox!.y).toBeGreaterThanOrEqual(tabDividerBox!.y + tabDividerBox!.height - 1);
  await page.getByRole('button', { name: '添加组件', exact: true }).click();
  await expect(page.locator('.editor-component-grid').getByText('图片区块', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '页面结构', exact: true }).click();
  await expect(page.locator('.editor-inspector-heading').getByRole('button', { name: /^删除/ })).toHaveCount(0);
  const tabBoxes = await rightTabs.evaluateAll(elements => elements.map(element => element.getBoundingClientRect()).map(box => ({ y: box.y, width: box.width })));
  expect(new Set(tabBoxes.map(box => box.y)).size).toBe(1);
  expect(tabBoxes.every(box => box.width > 0)).toBe(true);
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  await expect(page.getByLabel('导航名称 1')).toBeVisible();
  await expect(page.getByText('导航信息', { exact: true })).toHaveCSS('font-weight', '400');
  await page.locator('.editor-right-tabs button').filter({ hasText: '交互' }).click();
  await expect(page.getByText('锚点滚动', { exact: true })).toHaveCount(0);
  await expect(page.getByText('触发控件', { exact: true }).first()).toBeVisible();
  const headerBindings = page.locator('.editor-right-panel .event-binding');
  await expect(headerBindings.getByText('点击后执行', { exact: true })).toHaveCount(await headerBindings.count());
  await expect(page.getByText('关联事件', { exact: true })).toHaveCount(await headerBindings.count());
  const eventNodes = headerBindings.first().locator('.event-binding-node');
  const triggerBox = await eventNodes.nth(0).boundingBox();
  const actionBox = await eventNodes.nth(1).boundingBox();
  expect(actionBox!.y - (triggerBox!.y + triggerBox!.height)).toBeLessThanOrEqual(14);
  await headerBindings.first().locator('.ant-select').click();
  const eventSelectBox = await headerBindings.first().locator('.ant-select').boundingBox();
  const eventPopupBox = await page.locator('.site-editor-event-select-popup').boundingBox();
  expect(eventPopupBox!.y).toBeGreaterThanOrEqual(eventSelectBox!.y + eventSelectBox!.height - 2);
  const headerEventOptions = await page.locator('.ant-select-item-option-content').allTextContents();
  expect(headerEventOptions).toContain('定位：首屏横幅');
  expect(headerEventOptions).toContain('打开：联系我们弹窗');
  const selectedEventOption = page.locator('.ant-select-item-option-selected').first();
  await expect(selectedEventOption).toBeVisible();
  expect(await selectedEventOption.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(await selectedEventOption.evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await selectedEventOption.evaluate(element => getComputedStyle(element).fontSize)).toBe('12px');
  await page.keyboard.press('Escape');
  await page.locator('[data-editor-canvas] [data-section-type="hero"]').click();
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  const trustTitle = page.getByLabel('服务承诺标题 1');
  const trustDescription = page.getByLabel('服务承诺说明 1');
  await expect(trustTitle).toBeVisible();
  await expect(trustDescription).toBeVisible();
  const trustTitleBox = await trustTitle.boundingBox();
  const trustDescriptionBox = await trustDescription.boundingBox();
  expect(Math.abs(trustTitleBox!.y - trustDescriptionBox!.y)).toBeLessThanOrEqual(1);
  const trustInputHeight = trustTitleBox!.height;
  await page.locator('.editor-right-tabs button').filter({ hasText: '交互' }).click();
  const heroBinding = page.locator('.editor-right-panel .event-binding').first();
  await heroBinding.locator('.ant-select').click();
  const heroEventOptions = await page.locator('.ant-select-item-option-content').allTextContents();
  expect(heroEventOptions).toEqual(headerEventOptions);
  await page.keyboard.press('Escape');
  await page.locator('.editor-layer-list').getByText('页头导航', { exact: true }).click();
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  const headerPanel = page.locator('.editor-right-panel');
  await expect(headerPanel.getByRole('button', { name: '新增导航信息' })).toBeVisible();
  const headerNavigationCount = await headerPanel.getByRole('button', { name: /删除导航/ }).count();
  await headerPanel.getByRole('button', { name: '新增导航信息' }).click();
  await expect(headerPanel.getByRole('button', { name: /删除导航/ })).toHaveCount(headerNavigationCount + 1);
  await page.locator('.editor-right-tabs button').filter({ hasText: '样式' }).click();
  await expect(page.getByText('品牌 Logo', { exact: true })).toBeVisible();
  await expect(page.getByText('组件背景', { exact: true })).toBeVisible();
  await expect(page.getByText('背景图片', { exact: true })).toHaveCount(0);
  await expect(page.getByText('设置当前区块的颜色、透明度或背景图片')).toHaveCount(0);
  const inspector = page.locator('.editor-right-panel');
  await expect(inspector.locator('.ant-upload-wrapper').first()).toBeVisible();
  await expect(inspector.locator('.editor-picture-upload .ant-upload-select').first()).toBeVisible();
  const pictureCardBoxes = await inspector.locator('.editor-picture-upload .ant-upload-select').evaluateAll(elements => elements.map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  expect(pictureCardBoxes).toHaveLength(2);
  expect(new Set(pictureCardBoxes.map(box => `${box.width}x${box.height}`)).size).toBe(1);
  await expect(inspector.locator('.ant-color-picker-trigger')).toBeVisible();
  await expect(inspector.locator('.ant-slider')).toBeVisible();
  await page.locator('.editor-layer-list').getByText('首屏横幅', { exact: true }).click();
  await page.locator('.editor-right-tabs button').filter({ hasText: '样式' }).click();
  await expect(inspector.locator('.ant-switch').first()).toBeVisible();
  await expect(inspector.locator('.ant-upload-wrapper')).toHaveCount(1);
  const backgroundBox = await page.getByText('组件背景', { exact: true }).boundingBox();
  const firstSwitchBox = await inspector.locator('.ant-switch').first().boundingBox();
  expect(firstSwitchBox!.y).toBeGreaterThan(backgroundBox!.y);
  await expect(inspector.locator('.editor-toggle-list').locator('.border-b')).toHaveCount(0);
  await expect(inspector.locator('.editor-toggle-list')).toHaveCSS('border-top-style', 'solid');
  await expect(inspector.locator('.editor-toggle-item').first()).toHaveCSS('font-size', '12px');
  await expect(inspector.locator('.editor-toggle-item').first()).toHaveCSS('font-weight', '400');
  const backgroundTitleColor = await page.getByText('组件背景', { exact: true }).evaluate(element => getComputedStyle(element).color);
  await expect(inspector.locator('.editor-toggle-item').first()).toHaveCSS('color', backgroundTitleColor);
  await page.locator('.editor-layer-list').getByText('产品列表', { exact: true }).click();
  await expect(page.locator('.editor-inspector-heading').getByRole('button', { name: '删除产品列表' })).toBeVisible();
  await expect(page.locator('.site-renderer-root').getByText('精选产品与灵活起订量，满足全球品牌的采购需求。', { exact: true })).toBeVisible();
  await page.locator('.editor-right-tabs button').filter({ hasText: '样式' }).click();
  await expect(inspector.locator('.ant-segmented')).toBeVisible();
  await expect(inspector.locator('.editor-toggle-item')).toHaveText(['显示眉标', '显示按钮', '显示最小起订量']);
  await expect(inspector.getByText('显示产品分类', { exact: true })).toHaveCount(0);
  await expect(inspector.getByText('显示价格', { exact: true })).toHaveCount(0);
  const firstProductCard = page.locator('.editor-product-results .grid > div').first();
  await expect(firstProductCard.locator('.site-editor-product-category')).toBeHidden();
  await expect(firstProductCard.getByTestId('site-product-moq')).toContainText('最低起订量');
  const priceBox = await firstProductCard.getByTestId('site-product-price').boundingBox();
  const moqBox = await firstProductCard.getByTestId('site-product-moq').boundingBox();
  expect(moqBox!.y).toBeLessThan(priceBox!.y);
  await expect(firstProductCard.getByTestId('site-product-moq')).toHaveCSS('font-size', '10px');
  await expect(firstProductCard.getByTestId('site-product-moq')).toHaveCSS('font-weight', '400');
  await expect(firstProductCard.getByTestId('site-product-moq')).toHaveCSS('margin-bottom', '4px');
  await expect(firstProductCard.getByTestId('site-product-price')).toHaveCSS('font-size', '16px');
  await expect(firstProductCard.getByTestId('site-product-price')).toHaveCSS('padding-top', '8px');
  await expect(page.locator('.site-renderer-root').getByText('类别筛选', { exact: true })).toHaveCount(0);
  const allProductsNode = page.locator('.site-renderer-root .ant-tree-treenode').filter({ hasText: '全部商品' }).first();
  await expect(allProductsNode.locator('.ant-tree-title')).toHaveCSS('font-weight', '400');
  await expect(allProductsNode.locator('.ant-tree-node-content-wrapper')).toHaveCSS('min-height', '30px');
  const primaryCategoryNode = page.locator('.site-renderer-root .ant-tree-treenode').filter({ hasText: '超长的箱包产品分类名称用于验证省略号显示而不换行' }).first();
  const allCategoryBeforeSelection = await allProductsNode.boundingBox();
  const primaryCategoryBeforeSelection = await primaryCategoryNode.boundingBox();
  await primaryCategoryNode.locator('.ant-tree-node-content-wrapper').click();
  const allCategoryAfterSelection = await allProductsNode.boundingBox();
  const primaryCategoryAfterSelection = await primaryCategoryNode.boundingBox();
  expect(primaryCategoryAfterSelection?.height).toBe(primaryCategoryBeforeSelection?.height);
  expect(primaryCategoryAfterSelection!.y - allCategoryAfterSelection!.y).toBe(primaryCategoryBeforeSelection!.y - allCategoryBeforeSelection!.y);
  const categoryLabelBox = await allProductsNode.locator('.editor-product-tree-title > span').boundingBox();
  const badgeHeadingAlignmentBox = await page.locator('.site-renderer-root .editor-product-badge-heading h3').boundingBox();
  expect(categoryLabelBox).not.toBeNull();
  expect(badgeHeadingAlignmentBox).not.toBeNull();
  expect(Math.abs(categoryLabelBox!.x - badgeHeadingAlignmentBox!.x)).toBeLessThanOrEqual(1);
  await page.locator('.editor-layer-list').getByText('询盘表单', { exact: true }).click();
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  const formPanel = page.locator('.editor-right-panel');
  const inquiryFontSize = await page.locator('[data-editor-canvas] [data-section-type="form"] input').first().evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(inquiryFontSize).toBeGreaterThanOrEqual(10);
  const formLabelColor = await formPanel.getByText('联系人', { exact: true }).evaluate(element => getComputedStyle(element).color);
  const formContentColor = await formPanel.getByText('固定必填', { exact: true }).first().evaluate(element => getComputedStyle(element).color);
  expect(formLabelColor).toBe(formContentColor);
  await page.locator('.editor-global-settings button').filter({ hasText: '联系我们' }).click();
  await expect(page.getByText('联系我们', { exact: true }).last()).toBeVisible();
  await expect(page.locator('.editor-right-panel input').first()).toBeVisible();
  const dynamicContactPanel = page.locator('.editor-right-panel');
  await expect(dynamicContactPanel.getByText('区块标题', { exact: true })).toBeVisible();
  await expect(dynamicContactPanel.getByText('说明文字', { exact: true })).toBeVisible();
  await expect(dynamicContactPanel.getByText('联系信息', { exact: true })).toHaveCSS('font-weight', '400');
  await expect(dynamicContactPanel.getByText('暂无联系信息', { exact: true })).toBeVisible();
  await page.locator('[data-editor-canvas] [data-section-type="hero"]').getByRole('button', { name: '获取报价' }).click();
  const emptyContactPreview = page.getByRole('dialog', { name: '联系我们' });
  await expect(emptyContactPreview.getByText('暂无联系信息', { exact: true })).toBeVisible();
  await emptyContactPreview.getByRole('button', { name: '关闭' }).click();
  await dynamicContactPanel.getByRole('button', { name: '新增联系信息' }).click();
  await dynamicContactPanel.getByRole('button', { name: '新增联系信息' }).click();
  const contactItems = dynamicContactPanel.getByRole('button', { name: '删除联系信息' });
  await expect(contactItems).toHaveCount(2);
  const contactConfiguration = dynamicContactPanel.locator('.configuration-content');
  const contactPadding = await contactConfiguration.evaluate(element => { const style = getComputedStyle(element); return { top: style.paddingTop, bottom: style.paddingBottom }; });
  expect(contactPadding.top).toBe(contactPadding.bottom);
  await expect(contactConfiguration.getByText('标签', { exact: true })).toHaveCount(0);
  await expect(contactConfiguration.getByText('内容', { exact: true })).toHaveCount(0);
  const firstItem = contactItems.first().locator('..');
  expect((await firstItem.getByRole('textbox', { name: '联系信息标签 1' }).boundingBox())!.height).toBe(trustInputHeight);
  expect((await firstItem.getByRole('textbox', { name: '联系信息内容 1' }).boundingBox())!.height).toBe(trustInputHeight);
  await firstItem.getByRole('textbox', { name: '联系信息标签 1' }).fill('业务邮箱');
  await firstItem.getByRole('textbox', { name: '联系信息内容 1' }).fill('sales@example.com');
  const previewButton = dynamicContactPanel.getByRole('button', { name: '预览' });
  await expect(previewButton).toHaveText('');
  await expect(previewButton).toHaveCSS('border-width', '0px');
  await previewButton.click();
  const contactPreview = page.getByRole('dialog', { name: '联系我们' });
  await expect(contactPreview.getByText('业务邮箱', { exact: true })).toBeVisible();
  await expect(contactPreview.getByText('sales@example.com', { exact: true })).toBeVisible();
  await expect(contactPreview.getByText('-', { exact: true })).toHaveCount(2);
  await expect(contactPreview.locator('.editor-contact-preview-icon').first()).toHaveCSS('color', 'rgb(124, 110, 245)');
  await contactPreview.getByRole('button', { name: '关闭' }).click();
  await page.locator('.editor-layer-list').getByText('页脚', { exact: true }).click();
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  const footerPanel = page.locator('.editor-right-panel');
  await expect(footerPanel.getByText('暂无社交媒体', { exact: true })).toBeVisible();
  await expect(footerPanel.getByText('页脚联系方式同步自“联系我们”配置，当前共 2 项。', { exact: true })).toBeVisible();
  await expect(footerPanel.getByRole('button', { name: '新增页脚导航' })).toBeVisible();
  const footerNavigationCount = await footerPanel.getByRole('button', { name: /删除导航/ }).count();
  await footerPanel.getByRole('button', { name: '新增页脚导航' }).click();
  await expect(footerPanel.getByRole('button', { name: /删除导航/ })).toHaveCount(footerNavigationCount + 1);
  await footerPanel.getByRole('button', { name: '新增社交媒体' }).click();
  await expect(footerPanel.getByRole('textbox', { name: '社交媒体名称 1' })).toHaveJSProperty('placeholder', '');
  await expect(page.locator('[data-editor-canvas] [data-section-type="footer"] a[target="_blank"]')).toHaveCount(0);
  await footerPanel.getByRole('textbox', { name: '社交媒体名称 1' }).fill('领英');
  await footerPanel.getByRole('textbox', { name: '社交媒体链接 1' }).fill('https://linkedin.example');
  await footerPanel.getByRole('button', { name: '新增社交媒体' }).click();
  await footerPanel.getByRole('textbox', { name: '社交媒体名称 2' }).fill('Facebook');
  await footerPanel.getByRole('textbox', { name: '社交媒体链接 2' }).fill('https://facebook.example');
  await footerPanel.getByRole('textbox', { name: '版权信息' }).fill('© 2026 测试企业. All rights reserved.');
  await expect(page.locator('[data-editor-canvas] [data-section-type="footer"]')).toContainText('业务邮箱：sales@example.com');
  await expect(page.locator('[data-editor-canvas] [data-section-type="footer"]')).toContainText('领英');
  const editorSocialLinks = page.locator('[data-editor-canvas] [data-section-type="footer"] a[target="_blank"]');
  await expect(editorSocialLinks).toHaveCount(2);
  await expect(editorSocialLinks.nth(0)).toHaveAttribute('href', 'https://linkedin.example');
  await expect(editorSocialLinks.nth(1)).toHaveAttribute('href', 'https://facebook.example');
  await page.locator('.editor-right-tabs button').filter({ hasText: '样式' }).click();
  await expect(footerPanel.getByText('显示社交媒体', { exact: true })).toHaveCount(0);
  await page.locator('.editor-right-tabs button').filter({ hasText: '内容' }).click();
  await expect(page.locator('[data-editor-canvas] [data-section-type="footer"]')).toContainText('© 2026 测试企业. All rights reserved.');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect.poll(() => savedEditorPayload?.value?.siteInfo?.contactItems?.[0]?.label).toBe('业务邮箱');
  await expect.poll(() => savedEditorPayload?.value?.siteInfo?.contactItems?.[0]?.content).toBe('sales@example.com');
  await expect.poll(() => savedEditorPayload?.value?.pages?.home?.sections?.find((item: any) => item.type === 'footer')?.socialLinks?.[0]?.label).toBe('领英');
  await expect.poll(() => savedEditorPayload?.value?.pages?.home?.sections?.find((item: any) => item.type === 'footer')?.socialLinks?.length).toBe(2);
  await expect.poll(() => savedEditorPayload?.value?.pages?.home?.sections?.find((item: any) => item.type === 'footer')?.copyrightText).toBe('© 2026 测试企业. All rights reserved.');
  expect(savedEditorPayload.value.translationDescriptors.some((item: any) => item.path.includes('copyrightText'))).toBe(false);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.editor-global-settings button').filter({ hasText: '品牌主题' }).click();
  await expect(page.getByText('主题色号', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const selector of ['.editor-panel-tabs button.is-active', '.editor-right-tabs button.is-active']) {
    const activeTab = page.locator(selector);
    await expect(activeTab).toHaveCSS('border-top-left-radius', '6px');
    await expect(activeTab).toHaveCSS('border-bottom-left-radius', '0px');
    await expect(activeTab).toHaveCSS('border-bottom-right-radius', '0px');
    expect(await activeTab.evaluate(element => getComputedStyle(element).boxShadow)).not.toContain('inset');
  }
  const previewPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '站点预览' }).click();
  const preview = await previewPromise;
  await expect.poll(() => preview.url()).toContain('/site-preview');
  await preview.setViewportSize({ width: 1024, height: 900 });
  await expect(preview.locator('[data-site-preview-page]')).toBeVisible();
  await expect(preview.getByText('迈犀沃', { exact: true })).toHaveCount(0);
  expect(await preview.evaluate(() => getComputedStyle(document.body).overflow)).toBe('auto');
  expect(await preview.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight)).toBe(true);
  await preview.getByRole('button', { name: '查看产品', exact: true }).click();
  await expect.poll(() => preview.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const editorRendererSignature = await rendererSignature(page);
  expect(await rendererSignature(preview)).toEqual(editorRendererSignature);
  await page.getByRole('button', { name: '移动视图' }).click();
  await expect(page.locator('.site-renderer-root')).toHaveAttribute('data-device', 'mobile');
  await expect.poll(() => page.locator('.editor-canvas-stage > [data-editor-canvas]').evaluate(element => parseFloat(getComputedStyle(element).width))).toBe(390);
  mobileEditorRendererSignature = await rendererSignature(page);
  await preview.setViewportSize({ width: 390, height: 844 });
  await expect(preview.locator('.site-renderer-root')).toHaveAttribute('data-device', 'mobile');
  await expect(preview.locator('[data-section-type="products"]').getByText('精选产品与灵活起订量，满足全球品牌的采购需求。', { exact: true })).toBeHidden();
  expect(await rendererSignature(preview)).toEqual(mobileEditorRendererSignature);
  await page.getByRole('button', { name: '桌面视图' }).click();
  await preview.setViewportSize({ width: 1024, height: 900 });
  await page.locator('[data-editor-canvas] [data-section-type="hero"]').getByRole('button', { name: '获取报价' }).click();
  const editorContactSignature = await contactModalSignature(page);
  await preview.locator('[data-section-type="hero"]').getByRole('button', { name: '获取报价' }).click();
  expect(await contactModalSignature(preview)).toEqual(editorContactSignature);
  await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();
  await preview.getByRole('dialog').getByRole('button', { name: '关闭' }).click();
  await preview.close();
  await expect.poll(() => productPoolRequestUrl).toContain('/storefront/product-pool');
  expect(new URL(productPoolRequestUrl).searchParams.get('pageSize')).toBe('50');
  await expect(page.getByText('无标签产品', { exact: true })).toBeVisible();
  await expect(page.getByText('少量', { exact: true })).toHaveCount(0);
  const productCards = page.locator('.site-renderer-root .editor-product-results .grid > div');
  await expect(productCards).toHaveCount(10);
  await expect(page.locator('.site-renderer-root .editor-product-results > .ant-pagination')).toHaveCSS('padding-top', '32px');
  const productSummary = page.locator('.site-renderer-root .site-editor-product-summary').last();
  const productName = page.locator('.site-renderer-root .site-editor-product-name').last();
  await expect(productSummary).toHaveCSS('-webkit-line-clamp', '2');
  await expect(productSummary).toHaveCSS('overflow', 'hidden');
  await expect(productSummary).toHaveCSS('max-height', '38px');
  await expect(productSummary).toHaveCSS('line-height', '19px');
  await expect(productName).toHaveCSS('height', '20px');
  const nameBox = await productName.boundingBox();
  const summaryBox = await productSummary.boundingBox();
  expect(nameBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(Math.abs(summaryBox!.y - (nameBox!.y + nameBox!.height) - 4)).toBeLessThan(.5);
  const categoryTree = page.locator('.site-renderer-root .editor-product-filter .ant-tree');
  const productResults = page.locator('.site-renderer-root .editor-product-results');
  await expect(categoryTree).toBeVisible();
  await expect(page.locator('.editor-product-filter')).toHaveClass(/w-56/);
  expect((await page.locator('.editor-product-filter').boundingBox())!.width).toBeGreaterThanOrEqual(196);
  const allCategoryTitle = categoryTree.getByText('全部商品', { exact: true });
  const primaryCategoryTitle = categoryTree.getByText('超长的箱包产品分类名称用于验证省略号显示而不换行', { exact: true });
  const secondaryCategoryTitle = categoryTree.getByText('背包', { exact: true });
  const [allCategoryBox, primaryCategoryBox, secondaryCategoryBox] = await Promise.all([allCategoryTitle.boundingBox(), primaryCategoryTitle.boundingBox(), secondaryCategoryTitle.boundingBox()]);
  expect(Math.abs(allCategoryBox!.x - primaryCategoryBox!.x)).toBeLessThan(1);
  expect(secondaryCategoryBox!.x - primaryCategoryBox!.x).toBeLessThanOrEqual(14);
  await expect(primaryCategoryTitle).toHaveCSS('white-space', 'nowrap');
  await expect(primaryCategoryTitle).toHaveCSS('text-overflow', 'ellipsis');
  await expect(primaryCategoryTitle).toHaveCSS('overflow', 'hidden');
  expect(await primaryCategoryTitle.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  const titleAlignments = await categoryTree.locator('.editor-product-tree-title').evaluateAll(nodes => nodes.map(node => {
    const label = node.querySelector('span')!.getBoundingClientRect();
    const count = node.querySelector('small')!.getBoundingClientRect();
    return Math.abs((label.y + label.height / 2) - (count.y + count.height / 2));
  }));
  expect(Math.max(...titleAlignments)).toBeLessThan(1);
  const badgeFilters = page.locator('.site-renderer-root .editor-product-badge-filters');
  await expect(badgeFilters.getByText('商品标记', { exact: true })).toBeVisible();
  const selectAllBadges = badgeFilters.getByRole('checkbox', { name: '全选' });
  const newBadgeFilter = badgeFilters.getByRole('checkbox', { name: /新品 1/ });
  const hotBadgeFilter = badgeFilters.getByRole('checkbox', { name: /爆品 1/ });
  await expect(badgeFilters.getByRole('checkbox')).toHaveCount(5);
  await expect(badgeFilters).toHaveCSS('border-radius', '11px');
  const badgeHeadingBox = await badgeFilters.getByText('商品标记', { exact: true }).boundingBox();
  const selectAllBox = await selectAllBadges.locator('xpath=../..').boundingBox();
  const badgeFilterBox = await badgeFilters.boundingBox();
  expect(Math.abs((badgeHeadingBox!.y + badgeHeadingBox!.height / 2) - (selectAllBox!.y + selectAllBox!.height / 2))).toBeLessThan(1);
  expect(badgeFilterBox!.x + badgeFilterBox!.width - (selectAllBox!.x + selectAllBox!.width)).toBeLessThanOrEqual(15);
  await expect(badgeFilters.locator('.editor-product-badge-heading .ant-checkbox-label')).toHaveCSS('padding-left', '4px');
  await selectAllBadges.check();
  expect(await badgeFilters.getByRole('checkbox').evaluateAll(inputs => inputs.every(input => (input as HTMLInputElement).checked))).toBe(true);
  await expect(productCards).toHaveCount(2);
  await selectAllBadges.uncheck();
  expect(await badgeFilters.getByRole('checkbox').evaluateAll(inputs => inputs.every(input => !(input as HTMLInputElement).checked))).toBe(true);
  const badgeRowMetrics = await badgeFilters.locator('> div:last-child > label').evaluateAll(rows => rows.map(row => {
    const box = row.querySelector('.ant-checkbox')!.getBoundingClientRect();
    const label = row.querySelector('span > span')!.getBoundingClientRect();
    const count = row.querySelector('small')!.getBoundingClientRect();
    const center = (rect: DOMRect) => rect.y + rect.height / 2;
    const style = getComputedStyle(row);
    return { height: style.height, center: center(row.getBoundingClientRect()), checkboxLabelDelta: Math.abs(center(box) - center(label)), labelCountDelta: Math.abs(center(label) - center(count)) };
  }));
  expect(new Set(badgeRowMetrics.map(item => item.height))).toEqual(new Set(['26px']));
  const badgeRowSpacing = badgeRowMetrics.slice(1).map((item, index) => item.center - badgeRowMetrics[index].center);
  expect(Math.min(...badgeRowSpacing)).toBeGreaterThanOrEqual(29);
  expect(Math.max(...badgeRowSpacing)).toBeLessThanOrEqual(30);
  expect(Math.max(...badgeRowMetrics.map(item => item.checkboxLabelDelta))).toBeLessThan(1);
  expect(Math.max(...badgeRowMetrics.map(item => item.labelCountDelta))).toBeLessThan(1);
  await newBadgeFilter.check();
  await expect(productCards).toHaveCount(1);
  await expect(page.getByText('商品池长名称产品用于验证两行对齐', { exact: true })).toBeVisible();
  await hotBadgeFilter.check();
  await expect(productCards).toHaveCount(2);
  await newBadgeFilter.uncheck();
  await hotBadgeFilter.uncheck();
  await expect(productCards).toHaveCount(10);
  await expect(productResults).toHaveCSS('min-height', '620px');
  await categoryTree.getByText('空分类', { exact: true }).click();
  await expect(page.getByTestId('site-editor-product-empty')).toBeVisible();
  await expect(page.getByText('当前筛选暂无产品', { exact: true })).toBeVisible();
  await expect(page.getByText('请选择其他类别或商品标记', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看全部产品' })).toHaveCount(0);
  expect((await productResults.boundingBox())?.height || 0).toBeGreaterThanOrEqual(620);
  await categoryTree.getByText('全部商品', { exact: true }).click();
  await expect(productCards).toHaveCount(10);
  await expect(productResults.locator('.ant-pagination')).toBeVisible();
  await expect(page.getByTestId('site-editor-product-total')).toHaveCount(0);
  await expect(page.getByText('11 products', { exact: true })).toHaveCount(0);
  await expect(page.locator('.ant-pagination-next')).toHaveAttribute('title', '下一页');
  await page.locator('.editor-language-trigger').click();
  const languageOption = page.locator('.editor-language-popover button').filter({ hasText: 'en_US' });
  const englishNameInChinese = await page.evaluate(() => new Intl.DisplayNames(['zh-CN'], { type: 'language' }).of('en'));
  await expect(languageOption.locator('strong')).toHaveText(englishNameInChinese!);
  const languageCodeBox = await languageOption.locator('.editor-language-code').boundingBox();
  const languageCopyBox = await languageOption.locator('span').nth(1).boundingBox();
  expect(languageCopyBox!.x - (languageCodeBox!.x + languageCodeBox!.width)).toBeGreaterThanOrEqual(9);
  await languageOption.click();
  await expect(page.getByTestId('site-editor-product-total')).toHaveCount(0);
  await expect(page.locator('.ant-pagination-next')).toHaveAttribute('title', 'Next Page');
  await page.locator('.editor-language-trigger').click();
  const chineseNameInEnglish = await page.evaluate(() => new Intl.DisplayNames(['en-US'], { type: 'language' }).of('zh-Hans'));
  await expect(page.locator('.editor-language-popover button').filter({ hasText: 'zh_CN' }).locator('strong')).toHaveText(chineseNameInEnglish!);
  await expect(page.locator('.editor-language-popover button').filter({ hasText: 'en_US' }).locator('strong')).toHaveText('English');
  await expect(page.locator('.editor-language-popover')).not.toContainText('英语');
  await expect(page.locator('.editor-language-popover')).not.toContainText('英文');
  await page.locator('.editor-language-popover button').filter({ hasText: 'fr_FR' }).click();
  await expect(page.locator('.ant-pagination-next')).toHaveAttribute('title', 'Page suivante');
  await page.locator('.ant-pagination-next').click();
  await expect(productCards).toHaveCount(1);
  const pageSizeSelector = page.locator('.ant-pagination-options .ant-select-selector');
  await pageSizeSelector.click();
  await page.locator('.ant-select-item-option').filter({ hasText: '20' }).click();
  await expect(productCards).toHaveCount(11);
  await pageSizeSelector.click();
  await page.locator('.ant-select-item-option').filter({ hasText: '50' }).click();
  await expect(productCards).toHaveCount(11);
  await expect(page.getByText('测试独立站', { exact: true })).toBeVisible();
  await expect(page.getByRole('banner').getByText('外贸 ERP 与独立站平台', { exact: true })).toBeVisible();
  await expect(page.getByText('v1', { exact: true })).toBeVisible();
  await expect(page.getByText('当前站点', { exact: true })).toHaveCount(0);
  await expect(page.getByText('站点配额', { exact: true })).toHaveCount(0);
  const globalSettings = page.locator('.editor-global-settings');
  await expect(globalSettings.getByText('多语言', { exact: true })).toHaveCount(0);
  await expect(globalSettings.getByText('站点信息', { exact: true })).toHaveCount(0);
  await expect(globalSettings.getByText('联系我们', { exact: true })).toBeVisible();
  await expect(globalSettings.getByText('品牌主题', { exact: true })).toBeVisible();

  await globalSettings.getByRole('button', { name: /联系我们/ }).click();
  await expect(page.getByRole('dialog', { name: '联系我们设置' })).toHaveCount(0);
  const contactPanel = page.locator('.editor-right-panel');
  await contactPanel.locator('input').first().fill('获取专属报价');
  const contactDescription = contactPanel.locator('textarea').first();
  await expect(contactDescription).toHaveCSS('font-weight', '400');
  await contactDescription.fill('提交需求后我们会尽快联系您');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await expect.poll(() => savedEditorPayload?.value?.siteInfo?.contactModalTitle).toBe('获取专属报价');
  await expect.poll(() => savedEditorPayload?.value?.siteInfo?.contactModalSubtitle).toBe('提交需求后我们会尽快联系您');

  await page.getByRole('button', { name: '发布站点', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '发布站点' });
  await expect(page.locator('.ant-modal.app-modal.site-publish-modal')).toBeVisible();
  await expect(page.locator('.site-publish-modal .ant-modal-body')).toHaveCSS('overflow-y', 'visible');
  await expect.poll(async () => (await dialog.boundingBox())?.height || 0).toBeGreaterThanOrEqual(400);
  const confirm = dialog.getByRole('button', { name: '确认发布' });
  await expect(confirm).toHaveClass(/ant-btn-primary/);
  await expect(confirm).toBeDisabled();
  await dialog.getByPlaceholder('请填写本次发布的主要变更（必填）').fill('  首页升级  ');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => publishPayload).toEqual({ releaseNote: '首页升级' });
  await expect(page.getByRole('button', { name: '查看已发布站点' })).toBeEnabled();
  const publishedPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '查看已发布站点' }).click();
  const published = await publishedPromise;
  await expect.poll(() => published.url()).toBe('http://tenant.localhost:8080/');
  await published.setViewportSize({ width: 1024, height: 900 });
  await expect(published.locator('.site-renderer-root')).toBeVisible();
  await expect(published.locator('[data-section-type="hero"]')).toBeVisible();
  expect(await rendererSignature(published)).toEqual(editorRendererSignature);
  await published.setViewportSize({ width: 390, height: 844 });
  await expect(published.locator('.site-renderer-root')).toHaveAttribute('data-device', 'mobile');
  expect(await rendererSignature(published)).toEqual(mobileEditorRendererSignature);
  await published.setViewportSize({ width: 1024, height: 900 });
  await published.locator('[data-section-type="hero"]').getByRole('button', { name: '获取报价' }).click();
  expect(await contactModalSignature(published)).toEqual(editorContactSignature);
  await expect(published.getByText('商品池长名称产品用于验证两行对齐', { exact: true })).toBeVisible();
  await published.close();
  await expect(page.getByText('v2', { exact: true })).toBeVisible();
});

test('release history displays version, publisher, date and note', async ({ page }) => {
  await authenticate(page);
  const versionRequests: Array<{ page: string | null; pageSize: string | null }> = [];
  const versions = Array.from({ length: 21 }, (_, index) => ({ id: `version-${index + 1}`, siteId: 'site-1', version: index + 1, publishedBy: index === 1 ? 'publisher@example.com' : 'tester@example.com', publishedAt: '2026-10-14T08:00:00.000Z', releaseNote: index === 1 ? '首页升级' : `版本 ${index + 1}` }));
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.pathname.includes('/admin/sites/site-1/versions')) {
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const pageSize = Number(url.searchParams.get('pageSize') || 10);
      versionRequests.push({ page: url.searchParams.get('page'), pageSize: url.searchParams.get('pageSize') });
      return route.fulfill({ json: { data: { items: versions.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), total: versions.length, page: pageNumber, pageSize } } });
    }
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/storefront/releases`);
  await expect(page.getByRole('heading', { name: '发版历史', exact: true })).toBeVisible();
  for (const heading of ['版本号', '发版日期', '发版人', '发版备注']) await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
  await expect(page.getByText('v2', { exact: true })).toBeVisible();
  await expect(page.getByText('publisher@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('首页升级', { exact: true })).toBeVisible();
  await expect(page.getByText('共 21 条', { exact: true })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(11);
  await page.getByTitle('2').click();
  await expect(page.getByText('v11', { exact: true })).toBeVisible();
  await expect.poll(() => versionRequests).toContainEqual({ page: '2', pageSize: '10' });
  await page.locator('.ant-pagination-options .ant-select-selector').click();
  await page.getByText('20 条/页', { exact: true }).click();
  await expect(page.getByText('v20', { exact: true })).toBeVisible();
  await expect.poll(() => versionRequests).toContainEqual({ page: '1', pageSize: '20' });
  const settingsItem = page.getByRole('button', { name: '站点设置', exact: true });
  const releasesItem = page.getByRole('button', { name: '发版历史', exact: true });
  expect((await settingsItem.boundingBox())!.y).toBeLessThan((await releasesItem.boundingBox())!.y);
  const columnWidths = await page.getByRole('columnheader').evaluateAll(headers => headers.map(header => header.getBoundingClientRect().width));
  expect(new Set(columnWidths.map(width => Math.round(width))).size).toBeGreaterThan(1);
});
