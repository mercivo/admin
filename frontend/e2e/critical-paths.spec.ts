import { expect, test } from '@playwright/test';

test('admin stays in Chinese and clears the retired English preference', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mercivo_locale', 'en-US'));
  let requestLocale: { acceptLanguage?: string; locale?: string } = {};
  await page.route('**/api/v1/auth/login', async route => {
    const headers = route.request().headers();
    requestLocale = {
      acceptLanguage: headers['accept-language'],
      locale: headers['x-locale'],
    };
    await route.fulfill({ status: 401, json: { message: '账号或密码错误' } });
  });
  await page.goto('http://localhost:8088/login');
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.getByLabel('登录账号')).toBeVisible();
  await expect(page.getByRole('button', { name: /切换到英文|Switch to Chinese/ })).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(await page.evaluate(() => localStorage.getItem('mercivo_locale'))).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByLabel('登录账号').fill('invalid-account');
  await page.getByLabel('密码').fill('invalid-password');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect.poll(() => requestLocale).toEqual({ acceptLanguage: 'zh-CN', locale: 'zh-CN' });
});

test('customer can open the published storefront', async ({ page }) => {
  await page.goto(`${process.env.STOREFRONT_BASE_URL || 'http://localhost:8080'}/?site=${encodeURIComponent(process.env.E2E_SITE_KEY!)}`);
  await expect(page).not.toHaveTitle('Official Store');
  await expect(page.locator('.state')).toHaveCount(0);
  await expect(page.locator('.site-renderer-root')).toBeVisible();
});

test('merchant admin must authenticate and can load products', async ({ page }) => {
  await page.goto('http://localhost:8088/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const accountInput = page.getByLabel('登录账号');
  await accountInput.focus();
  await expect(accountInput).toBeFocused();
  expect(await accountInput.evaluate(element => getComputedStyle(element).lineHeight)).toBe('28px');
  expect(await accountInput.evaluate(element => getComputedStyle(element).height)).toBe('28px');
  await accountInput.fill(process.env.E2E_TENANT_PHONE!);
  await page.getByLabel('密码').fill(process.env.E2E_TENANT_PASSWORD!);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '经营概览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '经营概览' })).toBeVisible();
  await page.getByRole('button', { name: '商品列表' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('heading', { name: '商品列表' })).toBeVisible();
  await expect(page.locator('.app-data-table')).toBeVisible();
});

test('product creation uses real rich text and cloud image controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.create', 'page.customers'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (url.includes('/customers/pricing-policy')) return route.fulfill({ json: { data: { mode: 'base' } } });
    if (url.includes('/customers/levels')) return route.fulfill({ json: { data: [] } });
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: { site: { defaultCurrency: 'CNY' } } } });
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('http://localhost:8088/products/new');
  await expect(page.getByRole('heading', { name: '新建商品' })).toBeVisible();
  const expectNormalWeight = async (locator: ReturnType<typeof page.locator>) => {
    await expect(locator).toBeVisible();
    expect(await locator.evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  };
  await expectNormalWeight(page.getByRole('button', { name: '基本信息' }));
  for (const label of ['商品名称', '商品描述', '商品图片（最多 10 张，第一张为主图）', '同步设置', '同步到独立站', '商品分类', '商品标记', '点赞数量']) {
    await expectNormalWeight(page.getByText(label, { exact: true }).first());
  }
  await expect(page.getByText('库存提醒', { exact: true })).toHaveCount(0);
  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toBeVisible();
  await editor.fill('自动化富文本描述');
  await page.getByRole('button', { name: '粗体' }).click();
  await page.getByRole('button', { name: '无序列表' }).click();
  await expect(editor.locator('ul')).toBeVisible();
  await page.getByRole('button', { name: '无序列表' }).click();
  await page.getByRole('button', { name: '有序列表' }).click();
  await expect(editor.locator('ol')).toBeVisible();
  await page.getByRole('button', { name: '有序列表' }).click();
  await page.getByRole('button', { name: '引用' }).click();
  await expect(editor.locator('blockquote')).toBeVisible();
  await expect(page.getByRole('button', { name: '上传图片到商品描述' })).toBeVisible();
  await expect(page.getByTestId('rich-text-image-input')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  await expect(page.getByText('上传图片')).toBeVisible();
  await expect(page.getByRole('img', { name: '商品主图' })).toHaveCount(0);
  const imageInput = page.getByTestId('product-image-input');
  await expect(imageInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
  await page.getByRole('checkbox', { name: '同步到独立站' }).check();
  await page.getByRole('button', { name: '保存并同步' }).click();
  const syncConfirm = page.getByRole('dialog', { name: '确认同步' });
  await expect(syncConfirm).toBeVisible();
  await expect(syncConfirm).toHaveClass(/app-confirm-modal/);
  await expect(syncConfirm.getByText('保存后，商品将立即进入独立站商品池并更新前台展示。请确认所有信息填写正确。')).toBeVisible();
  const confirmBox = await syncConfirm.boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs((confirmBox?.x || 0) + (confirmBox?.width || 0) / 2 - (viewport?.width || 0) / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs((confirmBox?.y || 0) + (confirmBox?.height || 0) / 2 - (viewport?.height || 0) / 2)).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: /取\s*消/ }).last().click();
  await page.getByRole('button', { name: '规格库存' }).click();
  await expectNormalWeight(page.getByText('商品编码', { exact: true }));
  await expectNormalWeight(page.getByText('规格表（尺寸 × 颜色）', { exact: true }));
  await page.getByRole('button', { name: '客户等级价' }).click();
  await expectNormalWeight(page.getByText('客户等级专属价', { exact: true }));
  await expectNormalWeight(page.getByText('尚未创建客户等级', { exact: true }));
  await expectNormalWeight(page.getByRole('link', { name: '前往客户管理' }));
});

test('new product customer-management link uses the unified customer route', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.create', 'page.customers'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (url.includes('/customers/pricing-policy')) return route.fulfill({ json: { data: { mode: 'base' } } });
    if (url.includes('/customers/levels')) return route.fulfill({ json: { data: [] } });
    if (url.includes('/customers')) return route.fulfill({ json: { data: [] } });
    if (url.includes('/workspace/settings')) return route.fulfill({ json: { data: { site: { defaultCurrency: 'CNY' } } } });
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('http://localhost:8088/products/new');
  await page.getByRole('button', { name: '客户等级价' }).click();
  const customerLink = page.getByRole('link', { name: '前往客户管理' });
  await expect(customerLink).toHaveAttribute('href', '/customer');
  await customerLink.click();
  await expect(page).toHaveURL(/\/customer$/);
});

test('product category uses the shared primary action and Ant Design modal without exposing internal codes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '验收商户', permissions: ['page.product-categories'] }));
  });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [{ code: 'cat_internal_only', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } }));
  await page.goto('http://localhost:8088/product-categories');
  await expect(page.getByText('箱包', { exact: true })).toBeVisible();
  await expect(page.getByText('cat_internal_only', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: '编码' })).toHaveCount(0);

  const addButton = page.getByRole('button', { name: '新增一级分类' });
  await expect(addButton).toHaveCSS('background-color', 'rgb(124, 110, 245)');
  await expect(addButton).toHaveCSS('color', 'rgb(255, 255, 255)');
  await addButton.click();

  const modal = page.getByRole('dialog', { name: '新增一级分类' });
  await expect(modal).toBeVisible();
  await expect(modal).toHaveClass(/app-modal/);
  await expect(modal.getByText('编码', { exact: true })).toHaveCount(0);
  await expect(modal.getByPlaceholder('分类名称')).toBeVisible();
  await expect(modal.locator('.ant-modal-footer')).toHaveCSS('text-align', 'end');
  await expect(modal.locator('.ant-modal-footer button')).toHaveCount(2);

  await modal.getByRole('button', { name: /取\s*消/ }).click();
  await expect(modal).toHaveCount(0);
});

test('product category tree table expands every parent by default', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.product-categories'] }));
  });
  await page.route('**/api/v1/**', route => {
    if (route.request().url().includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.product-categories'] } } });
    return route.fulfill({ json: { data: [
      { code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [
        { code: 'totes', label: '托特包', sort: 1, status: 'enabled', remark: '' },
        { code: 'backpacks', label: '双肩包', sort: 2, status: 'enabled', remark: '' },
      ] },
      { code: 'apparel', label: '服饰', sort: 2, status: 'enabled', remark: '', children: [
        { code: 'shirts', label: 'T恤', sort: 1, status: 'enabled', remark: '' },
      ] },
    ] } });
  });

  await page.goto('http://localhost:8088/product-categories');
  await expect(page.getByText('托特包', { exact: true })).toBeVisible();
  await expect(page.getByText('双肩包', { exact: true })).toBeVisible();
  await expect(page.getByText('T恤', { exact: true })).toBeVisible();

  const bagsRow = page.getByRole('row').filter({ hasText: '箱包' }).first();
  await bagsRow.getByRole('button').first().click();
  await expect(page.getByText('托特包', { exact: true })).toHaveCount(0);
  await expect(page.getByText('T恤', { exact: true })).toBeVisible();
});

test('product management renders an Ant Design category tree in the customer-level sidebar layout', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.create', 'product-category.manage'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['group.products', 'menu.products', 'page.products', 'menu.product-categories', 'page.product-categories', 'product.create', 'product-category.manage'] } } });
    if (url.includes('/product-categories')) return route.fulfill({ json: { data:
      [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [{ code: 'totes', label: '托特包', sort: 1, status: 'enabled', remark: '' }, { code: 'backpacks', label: '双肩包', sort: 2, status: 'enabled', remark: '' }, { code: 'long-name', label: '这是一个用于验证超长分类名称省略号渲染效果的分类', sort: 3, status: 'enabled', remark: '' }] }]
    } });
    if (url.includes('/product')) {
      const products = [
        { id: '1', nameZh: '棉布托特包', sku: 'TOTE-01', price: '¥10', stock: 100, moq: 10, status: 'published', category: 'totes', img: '', hot: false },
        { id: '2', nameZh: '旅行双肩包', sku: 'PACK-01', price: '¥30', stock: 50, moq: 5, status: 'pending', category: 'backpacks', img: '', hot: false },
      ];
      const requestedCategories = new URL(url).searchParams.get('category')?.split(',') || [];
      const items = requestedCategories.length ? products.filter(product => requestedCategories.includes(product.category)) : products;
      return route.fulfill({ json: { data: {
      items,
      total: items.length,
      page: 1,
      pageSize: 20,
      summary: { categoryCounts: { totes: 1, backpacks: 1 }, totalProducts: 2 },
    } } });
    }
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('http://localhost:8088/products');

  await expect(page.getByRole('heading', { name: '商品列表', exact: true })).toBeVisible();
  await expect(page.getByTestId('admin-table-skeleton')).toHaveCount(0);
  expect(await page.getByRole('button', { name: '商品管理', exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await page.getByRole('button', { name: '商品列表', exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  const sidebar = page.locator('aside').filter({ has: page.getByRole('heading', { name: '商品分类' }) });
  await expect(sidebar).toBeVisible();
  const sidebarBox = await sidebar.boundingBox();
  const productPanelBox = await page.locator('main section').filter({ has: page.locator('.ant-table') }).boundingBox();
  expect(Math.round(sidebarBox?.width || 0)).toBe(240);
  expect(Math.abs((sidebarBox?.height || 0) - (productPanelBox?.height || 0))).toBeLessThanOrEqual(1);
  expect(productPanelBox?.x || 0).toBeGreaterThan((sidebarBox?.x || 0) + (sidebarBox?.width || 0));
  await expect(sidebar.locator('.ant-tree')).toBeVisible();
  await expect(page.locator('main section .ant-table')).toBeVisible();
  for (const column of ['商品', '商品编码', '库存', '最小起订量', '状态', '操作']) {
    await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: /价格区间/ })).toBeVisible();
  await expect(sidebar.getByText('箱包', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('托特包', { exact: true })).toBeVisible();
  const parentNode = sidebar.locator('.ant-tree-treenode').filter({ hasText: '箱包' }).first();
  const switcherBox = await parentNode.locator('.ant-tree-switcher').boundingBox();
  const nameBox = await parentNode.locator('.ant-tree-title > span > span').first().boundingBox();
  const countBox = await parentNode.locator('.ant-tree-title > span > span').last().boundingBox();
  const parentNameWeight = await parentNode.locator('.ant-tree-title > span > span').first().evaluate(element => getComputedStyle(element).fontWeight);
  const allProductsWeight = await sidebar.getByTestId('all-products-category').locator('span').first().evaluate(element => getComputedStyle(element).fontWeight);
  const switcherColor = await parentNode.locator('.ant-tree-switcher').evaluate(element => getComputedStyle(element).color);
  const parentNodeBox = await parentNode.boundingBox();
  const allProductsBox = await sidebar.getByTestId('all-products-category').boundingBox();
  const centerY = (box: { y: number; height: number } | null) => (box?.y || 0) + (box?.height || 0) / 2;
  expect(Math.abs(centerY(switcherBox) - centerY(nameBox))).toBeLessThanOrEqual(1);
  expect(Math.abs(centerY(nameBox) - centerY(countBox))).toBeLessThanOrEqual(1);
  expect(switcherColor).toBe('rgb(124, 110, 245)');
  expect(parentNameWeight).toBe('400');
  expect(allProductsWeight).toBe('400');
  expect(parentNodeBox?.height || 0).toBeLessThanOrEqual(36);
  expect(allProductsBox?.height).toBe(parentNodeBox?.height);
  const longCategoryName = sidebar.locator('[title="这是一个用于验证超长分类名称省略号渲染效果的分类"]');
  await expect(longCategoryName).toHaveCSS('text-overflow', 'ellipsis');
  expect(await longCategoryName.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await expect(page.getByText('棉布托特包')).toBeVisible();
  await expect(page.getByText('旅行双肩包')).toBeVisible();
  await expect(page.getByText('未同步', { exact: true })).toBeVisible();
  await expect(page.getByText('草稿', { exact: true })).toHaveCount(0);
  await expect(page.locator('.app-data-table .ant-table-pagination')).toHaveCSS('margin-left', '12px');
  await expect(page.locator('.app-data-table .ant-table-pagination')).toHaveCSS('margin-right', '12px');

  await page.getByRole('button', { name: '图片视图' }).click();
  await expect(page.locator('.product-grid-pagination')).toHaveCSS('padding-left', '12px');
  await expect(page.locator('.product-grid-pagination')).toHaveCSS('padding-right', '12px');
  await page.getByRole('button', { name: '表格视图' }).click();

  await sidebar.getByText('托特包', { exact: true }).click();
  await expect(page.getByText('棉布托特包')).toBeVisible();
  await expect(page.getByText('旅行双肩包')).toHaveCount(0);
  await expect(page.getByText('共 1 件商品', { exact: true })).toBeVisible();
  await sidebar.getByText('箱包', { exact: true }).click();
  await expect(page.getByText('旅行双肩包')).toBeVisible();
  await expect(page.getByText('共 2 件商品', { exact: true })).toBeVisible();
});

test('storefront product pool is a read-only category tree and synced product table', async ({ page }) => {
  const permissions = ['group.site', 'menu.storefront.products', 'page.storefront.products'];
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: value }));
  }, permissions);
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/storefront/product-pool')) return route.fulfill({ json: { data: {
      items: [{ id: 'synced-1', nameZh: '已同步托特包', sku: 'SYNC-001', stock: 80, moq: 10, status: 'published', category: 'totes', img: '', description: '<p>适合<strong>品牌定制</strong></p><ul><li>环保棉布</li><li>支持印花</li></ul>', hot: true, badge: 'bestseller', likeCount: 128, tags: ['环保', '棉布', '可定制'], updatedAt: '2026-10-14T08:00:00.000Z' }],
      total: 1,
      page: 1,
      pageSize: 20,
      categoryCounts: { totes: 1 },
      categories: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [{ code: 'totes', label: '托特包', sort: 1, status: 'enabled', remark: '' }] }, ...Array.from({ length: 30 }, (_, index) => ({ code: `extra-${index}`, label: index === 0 ? '这是一个用于验证商品池超长分类名称省略号渲染效果的一级分类' : `扩展分类 ${index + 1}`, sort: index + 2, status: 'enabled', remark: '', children: [] }))],
      summary: { totalProducts: 1 },
    } } });
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('http://localhost:8088/storefront/products');

  await expect(page.getByRole('heading', { name: '商品池', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '商品分类', exact: true })).toBeVisible();
  const categorySidebar = page.locator('aside').filter({ has: page.getByRole('heading', { name: '商品分类' }) });
  const categorySidebarBox = await categorySidebar.boundingBox();
  const productPoolPanelBox = await page.locator('main section').boundingBox();
  expect(Math.round(categorySidebarBox?.width || 0)).toBe(240);
  expect(Math.abs((categorySidebarBox?.height || 0) - (productPoolPanelBox?.height || 0))).toBeLessThanOrEqual(1);
  const categoryScroller = categorySidebar.locator('.overflow-y-auto');
  expect(await categoryScroller.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const longPoolCategoryName = categorySidebar.locator('[title="这是一个用于验证商品池超长分类名称省略号渲染效果的一级分类"]');
  await expect(longPoolCategoryName).toHaveCSS('text-overflow', 'ellipsis');
  expect(await longPoolCategoryName.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  await expect(page.locator('aside .ant-tree')).toBeVisible();
  await expect(page.locator('main section .ant-table')).toBeVisible();
  await expect(page.getByText('已同步托特包', { exact: true })).toBeVisible();
  await expect(page.getByText('已同步', { exact: true })).toBeVisible();
  await expect(page.getByText('商品与分类仅供查看', { exact: true })).toBeVisible();
  await expect(page.getByText('环保', { exact: true })).toBeVisible();
  await expect(page.getByText('棉布', { exact: true })).toBeVisible();
  await expect(page.getByText('🔥', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /128/ })).toBeVisible();
  const viewProductButton = page.getByRole('button', { name: '查看商品', exact: true });
  await expect(viewProductButton).toHaveClass(/app-table-action-button/);
  await expect(viewProductButton).not.toContainText('查看');
  await viewProductButton.click();
  const productDialog = page.getByRole('dialog', { name: '商品详情' });
  await expect(productDialog).toBeVisible();
  await expect(productDialog.getByText('已同步托特包', { exact: true })).toHaveCount(1);
  await expect(productDialog.getByText('热销', { exact: true })).toBeVisible();
  await expect(productDialog.getByText('可定制', { exact: true })).toBeVisible();
  await expect(productDialog.getByText('128', { exact: true })).toBeVisible();
  const richDescription = productDialog.getByTestId('storefront-product-description');
  await expect(richDescription.locator('strong')).toHaveText('品牌定制');
  await expect(richDescription.locator('li')).toHaveCount(2);
  await expect(productDialog.getByText('该数据由 ERP 商品管理同步', { exact: true })).toBeVisible();
  await expect(productDialog.getByText('独立站商品池不提供编辑入口。', { exact: true })).toHaveCount(0);
  await expect(page.locator('.app-data-table .ant-table-pagination')).toHaveCSS('margin-left', '12px');
  await expect(page.locator('.app-data-table .ant-table-pagination')).toHaveCSS('margin-right', '12px');
  await expect(page.getByRole('button', { name: /管理商品分类|编辑/ })).toHaveCount(0);
});

test('customer management exposes only profile fields and sends a statistics-free payload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.customers', 'customer.create'] }));
  });
  let createdPayload: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.customers', 'customer.create'] } } });
    if (url.endsWith('/customers') && route.request().method() === 'POST') {
      createdPayload = route.request().postDataJSON();
      return route.fulfill({ json: { data: { id: 'customer-1', ...createdPayload, company: '示例客户', orders: 0, totalAmount: 0, lastOrderAt: null } } });
    }
    if (url.endsWith('/customers/levels')) return route.fulfill({ json: { data: [{ id: 'level-1', code: 'vip', name: '重点客户', note: '优先跟进' }] } });
    if (url.includes('/customers/pricing-policy')) return route.fulfill({ json: { data: { mode: 'base' } } });
    return route.fulfill({ json: { data: [] } });
  });

  await page.goto('http://localhost:8088/customer');
  for (const column of ['客户名称', '邮箱', '手机号', '客户等级', '折扣政策', '国家', '客户状态', '操作']) {
    await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
  }
  for (const hiddenColumn of ['成交订单', '累计成交额（CNY）', '最近成交']) {
    await expect(page.getByRole('columnheader', { name: hiddenColumn, exact: true })).toHaveCount(0);
  }
  expect(await page.getByText('全部客户', { exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await page.getByTestId('customer-level-name').evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');

  await page.getByRole('button', { name: '新增客户' }).click();
  for (const field of ['客户名称', '邮箱', '手机号', '国家', '客户备注']) {
    await expect(page.getByPlaceholder(field, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('combobox', { name: '客户等级', exact: true })).toBeVisible();
  await expect(page.locator('.ant-modal .ant-select-selection-placeholder', { hasText: '客户等级' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '客户状态', exact: true })).toBeVisible();
  const customerForm = page.locator('.ant-modal .app-modal-form');
  const labelStyle = await customerForm.locator('.ant-form-item-label label').first().evaluate(element => {
    const style = getComputedStyle(element);
    return { fontSize: style.fontSize, fontWeight: style.fontWeight, color: style.color };
  });
  expect(labelStyle).toEqual({ fontSize: '12px', fontWeight: '700', color: 'rgb(122, 116, 160)' });
  await expect(customerForm.locator('.ant-input-filled')).toHaveCount(5);
  await expect(customerForm.locator('.ant-select-filled')).toHaveCount(2);
  await page.getByPlaceholder('客户名称', { exact: true }).fill('示例客户');
  await page.getByRole('button', { name: /保\s*存/ }).click();
  await expect.poll(() => createdPayload).not.toBeNull();
  expect(createdPayload).toEqual({ name: '示例客户', email: '', phone: null, level: '', country: '', status: 'active', notes: '' });
});

test('tenant operations modules load their production APIs', async ({ page }) => {
  const apiErrors: string[] = [];
  page.on('response', response => { if (response.url().includes('/api/v1/') && response.status() >= 400) apiErrors.push(`${response.status()} ${response.url()}`); });
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('登录账号').fill(process.env.E2E_TENANT_PHONE!);
  await page.getByLabel('密码').fill(process.env.E2E_TENANT_PASSWORD!);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '经营概览' })).toBeVisible();

  const modules = [
    { path: '/products', heading: '商品列表', api: '/api/v1/product' },
    { path: '/customer', heading: '客户管理', api: '/api/v1/customers' },
    { path: '/settings', heading: '账号信息', api: '/api/v1/workspace/settings' },
    { path: '/product-categories', heading: '商品分类', api: '/api/v1/product-categories' },
  ];
  for (const module of modules) {
    const responsePromise = page.waitForResponse(response => response.url().includes(module.api) && response.request().method() === 'GET');
    await page.goto(`http://localhost:8088${module.path}`);
    expect((await responsePromise).status()).toBe(200);
    await expect(page.getByRole('heading', { name: module.heading, exact: true })).toBeVisible();
  }

  const siteResponse = page.waitForResponse(response => response.url().includes('/api/v1/admin/sites') && response.request().method() === 'GET');
  await page.goto('http://localhost:8088/site-editor');
  expect((await siteResponse).status()).toBe(200);
  await expect(page.getByRole('button', { name: '站点预览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '发布站点', exact: true })).toBeVisible();
  expect(apiErrors).toEqual([]);
});

test('system administrator can view and control all merchants', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('登录账号').fill(process.env.E2E_SYSTEM_ADMIN_USERNAME || 'admin');
  await page.getByLabel('密码').fill(process.env.E2E_SYSTEM_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/system\/overview$/);
  await expect(page.getByRole('heading', { name: '运营概览', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '运营概览', exact: true })).toHaveCount(2);
  await expect(page.getByText('ERP 与站点运营', { exact: true })).toBeVisible();
  await expect(page.getByText('订阅经营', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '商户管理', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '套餐与订单', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '配额与权限', exact: true }).click();
  await expect(page.getByRole('heading', { name: '配额与权限' })).toBeVisible();
  await page.getByRole('button', { name: '套餐管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '套餐管理' })).toBeVisible();
  await page.getByRole('button', { name: '编辑套餐', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: '功能权限' })).toBeVisible();
  await expect(page.getByText('一级菜单').first()).toBeVisible();
  await expect(page.getByText('二级菜单').first()).toBeVisible();
  await expect(page.getByText('功能页面').first()).toBeVisible();
  await expect(page.getByText('按钮', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '取 消' }).click();
  await page.getByRole('button', { name: '租户档案', exact: true }).click();
  const merchantSearch = page.getByPlaceholder('搜索租户名称、标识或管理员账号');
  await expect(merchantSearch).toBeVisible();
  await merchantSearch.focus();
  await expect(merchantSearch).toBeFocused();
  expect(Number.parseFloat(await merchantSearch.evaluate(element => getComputedStyle(element).lineHeight))).toBeGreaterThanOrEqual(20);
});

test('system administrator sees the unified operations overview', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('登录账号').fill(process.env.E2E_SYSTEM_ADMIN_USERNAME || 'admin');
  await page.getByLabel('密码').fill(process.env.E2E_SYSTEM_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/system\/overview$/);
  await expect(page.getByRole('heading', { name: '运营概览', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '运营概览', exact: true })).toHaveCount(2);
  await expect(page.getByText('ERP / 站点分析', { exact: true })).toHaveCount(0);
  await expect(page.getByText('近 12 个月租户增长', { exact: true })).toBeVisible();
  await expect(page.getByTestId('tenant-growth-chart').locator('canvas')).toBeVisible();
  await expect(page.getByText('ERP 与站点运营', { exact: true })).toBeVisible();
  await expect(page.getByText('订阅经营', { exact: true })).toBeVisible();
  await expect(page.getByText('已确认订阅订单', { exact: true })).toBeVisible();
  await expect(page.getByText('付费租户占比', { exact: true })).toBeVisible();
  await expect(page.getByText('运营快捷入口', { exact: true })).toHaveCount(0);
  await expect(page.getByText('资源健康度', { exact: true })).toBeVisible();
  await page.goto('http://localhost:8088/system/analytics');
  await expect(page).toHaveURL(/\/system\/overview$/);
});

test('public registration is temporarily unavailable', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await expect(page.getByText('注册', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('登录账号')).toBeVisible();
  await expect(page.getByText('系统管理员可使用专属账号登录', { exact: true })).toHaveCount(0);
});
