import { expect, test } from '@playwright/test';

test('language can switch globally and persists after reload', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByRole('button', { name: '切换到英文' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByLabel('Phone / system administrator account')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await page.getByRole('button', { name: 'Switch to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('customer can open the published storefront', async ({ page }) => {
  await page.goto('http://localhost');
  await expect(page).toHaveTitle(/EcoBags Official/);
  await expect(page.getByRole('heading', { name: /Responsible products/i })).toBeVisible();
  await expect(page.locator('.product')).toHaveCount(5);
});

test('merchant admin must authenticate and can load products', async ({ page }) => {
  await page.goto('http://localhost:8088/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const accountInput = page.getByLabel('手机号 / 系统管理员账号');
  await accountInput.focus();
  await expect(accountInput).toBeFocused();
  expect(await accountInput.evaluate(element => getComputedStyle(element).lineHeight)).toBe('28px');
  expect(await accountInput.evaluate(element => getComputedStyle(element).height)).toBe('28px');
  await accountInput.fill('13800000000');
  await page.getByLabel('密码').fill(process.env.E2E_TENANT_PASSWORD || 'TestTenant!Only2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '仪表盘' })).toBeVisible();
  await page.getByRole('button', { name: '外贸 ERP' }).click();
  await page.getByText('商品管理', { exact: true }).first().click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText('Eco Shopping Bag')).toBeVisible();
});

test('product creation uses real rich text and cloud image controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
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
  for (const label of ['商品名称', '商品描述', '商品图片（拖拽排序）', '发布设置', '同步到独立站', '商品分类', '商品标记', '点赞数量', '库存提醒']) {
    await expectNormalWeight(page.getByText(label, { exact: true }).first());
  }
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
    localStorage.setItem('mercivo_access_token', 'e2e-token');
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
    localStorage.setItem('mercivo_access_token', 'e2e-token');
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
    localStorage.setItem('mercivo_access_token', 'e2e-token');
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
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.create', 'product-category.manage'] }));
  });
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['group.products', 'menu.products', 'page.products', 'menu.product-categories', 'page.product-categories', 'product.create', 'product-category.manage'] } } });
    return route.fulfill({ json: { data: url.includes('/product-categories')
      ? [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [{ code: 'totes', label: '托特包', sort: 1, status: 'enabled', remark: '' }, { code: 'backpacks', label: '双肩包', sort: 2, status: 'enabled', remark: '' }] }]
      : [
        { id: '1', nameZh: '棉布托特包', nameEn: 'Cotton Tote', sku: 'TOTE-01', price: '¥10', stock: 100, moq: 10, status: 'published', category: 'totes', img: '', hot: false },
        { id: '2', nameZh: '旅行双肩包', nameEn: 'Travel Backpack', sku: 'PACK-01', price: '¥30', stock: 50, moq: 5, status: 'draft', category: 'backpacks', img: '', hot: false },
      ] } });
  });
  await page.goto('http://localhost:8088/products');

  await expect(page.getByRole('heading', { name: '商品列表', exact: true })).toBeVisible();
  expect(await page.getByRole('button', { name: '商品管理', exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  expect(await page.getByRole('button', { name: '商品列表', exact: true }).evaluate(element => getComputedStyle(element).fontWeight)).toBe('400');
  const sidebar = page.locator('aside').filter({ has: page.getByRole('heading', { name: '商品分类' }) });
  await expect(sidebar).toBeVisible();
  const sidebarBox = await sidebar.boundingBox();
  const productPanelBox = await page.locator('main section').boundingBox();
  expect(Math.round(sidebarBox?.width || 0)).toBe(280);
  expect(productPanelBox?.x || 0).toBeGreaterThan((sidebarBox?.x || 0) + (sidebarBox?.width || 0));
  await expect(sidebar.locator('.ant-tree')).toBeVisible();
  await expect(page.locator('main section .ant-table')).toBeVisible();
  for (const column of ['商品', '商品编码', '价格区间', '库存', '最小起订量', '状态', '操作']) {
    await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
  }
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
  await expect(page.getByText('棉布托特包')).toBeVisible();
  await expect(page.getByText('旅行双肩包')).toBeVisible();

  await sidebar.getByText('托特包', { exact: true }).click();
  await expect(page.getByText('棉布托特包')).toBeVisible();
  await expect(page.getByText('旅行双肩包')).toHaveCount(0);
  await expect(page.getByText('共 1 件商品', { exact: true })).toHaveCount(0);
  await sidebar.getByText('箱包', { exact: true }).click();
  await expect(page.getByText('旅行双肩包')).toBeVisible();
  await expect(page.getByText('共 2 件商品', { exact: true })).toHaveCount(0);
});

test('customer management exposes only profile fields and sends a statistics-free payload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
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
  const customerForm = page.locator('.ant-modal .category-style-form');
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
  await page.getByLabel('手机号 / 系统管理员账号').fill('13800000000');
  await page.getByLabel('密码').fill(process.env.E2E_TENANT_PASSWORD || 'TestTenant!Only2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '工作台' })).toBeVisible();

  const modules = [
    { path: '/products', heading: '商品列表', api: '/api/v1/product' },
    { path: '/customer', heading: '客户管理', api: '/api/v1/customers' },
    { path: '/settings', heading: '设置', api: '/api/v1/workspace/config/settings' },
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
  await expect(page.getByText('迈犀沃建站', { exact: true })).toBeVisible();
  expect(apiErrors).toEqual([]);
});

test('system administrator can view and control all merchants', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByLabel('手机号 / 系统管理员账号').fill('admin');
  await page.getByLabel('密码').fill(process.env.E2E_SYSTEM_ADMIN_PASSWORD || 'TestAdmin!Only2026');
  await page.getByRole('button', { name: '安全登录' }).click();
  await expect(page).toHaveURL(/\/system\/overview$/);
  await expect(page.getByRole('heading', { name: '平台运营总览' })).toBeVisible();
  await expect(page.getByRole('button', { name: '平台概览', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '商户管理', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '套餐与订单', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '配额与权限', exact: true }).click();
  await expect(page.getByRole('heading', { name: '配额与权限' })).toBeVisible();
  await page.getByRole('button', { name: '套餐管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '套餐管理' })).toBeVisible();
  await page.getByRole('button', { name: '编辑套餐', exact: true }).first().click();
  await expect(page.getByText('套餐菜单与功能权限')).toBeVisible();
  await expect(page.getByText('一级菜单').first()).toBeVisible();
  await expect(page.getByText('二级菜单').first()).toBeVisible();
  await expect(page.getByText('功能页面').first()).toBeVisible();
  await expect(page.getByText('按钮', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '取 消' }).click();
  await page.getByRole('button', { name: '租户档案', exact: true }).click();
  const merchantSearch = page.getByPlaceholder('搜索租户名称或标识');
  await expect(merchantSearch).toBeVisible();
  await merchantSearch.focus();
  await expect(merchantSearch).toBeFocused();
  expect(Number.parseFloat(await merchantSearch.evaluate(element => getComputedStyle(element).lineHeight))).toBeGreaterThanOrEqual(20);
});

test('registration shows a graphical captcha and account fields', async ({ page }) => {
  await page.goto('http://localhost:8088/login');
  await page.getByText('注册', { exact: true }).click();
  await expect(page.getByLabel('企业/店铺名称')).toBeVisible();
  await expect(page.getByLabel('手机号')).toBeVisible();
  const passwordBox = await page.getByLabel('登录密码').boundingBox();
  const confirmBox = await page.getByLabel('确认密码').boundingBox();
  expect(passwordBox).not.toBeNull();
  expect(confirmBox).not.toBeNull();
  expect(confirmBox!.y).toBeGreaterThan(passwordBox!.y + passwordBox!.height);
  expect(Math.abs(confirmBox!.width - passwordBox!.width)).toBeLessThan(2);
  await expect(page.getByAltText('图形验证码')).toBeVisible();
});
