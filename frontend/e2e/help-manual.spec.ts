import { expect, test, type Page } from '@playwright/test';

const installIdentity = async (page: Page, role: 'member' | 'system_admin' = 'member', permissions: string[] = []) => {
  await page.addInitScript(({ identityRole, granted }) => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: identityRole, account: 'member@example.com', name: identityRole === 'member' ? '普通成员' : '系统管理员' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '培训测试企业', permissions: granted }));
  }, { identityRole: role, granted: permissions });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: { permissions } } }));
};

test('standalone training manual is accessible without feature permissions', async ({ page }) => {
  await installIdentity(page);
  await page.goto('/help');

  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByTestId('standalone-help')).toBeVisible();
  await expect(page.getByRole('heading', { name: '老板看得懂，运营做得成' })).toBeVisible();
  await expect(page.getByText('老板重点看').first()).toBeVisible();
  await expect(page.getByText('运营重点做').first()).toBeVisible();
  await expect(page.getByText('ERP 管理', { exact: true })).toHaveCount(0);
  await expect(page.getByText('站点设计', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /普通成员/ })).toHaveCount(0);

  const directory = page.getByRole('navigation', { name: '培训手册目录' });
  for (const item of ['开通后的首次配置', '建立商品经营基础', '采购到入库', '销售到回款', '库存日常管理', '独立站上线', '询盘到成交', '老板经营复盘']) {
    await expect(directory.getByRole('button', { name: new RegExp(item) })).toBeVisible();
    await expect(page.getByRole('heading', { name: item, exact: true })).toBeVisible();
  }

  const sidebarBox = await page.getByTestId('manual-directory').boundingBox();
  const contentBox = await page.locator('main').boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(sidebarBox!.x + sidebarBox!.width).toBeLessThan(contentBox!.x);

  await directory.getByRole('button', { name: /库存日常管理/ }).click();
  await expect(page).toHaveURL(/#inventory-operations$/);
  await expect(page.locator('#inventory-operations')).toBeInViewport();

  const screenshots = page.locator('img[src*="/training-assets/"]');
  await expect(screenshots).toHaveCount(7);
  for (let index = 0; index < 7; index += 1) {
    const screenshot = screenshots.nth(index);
    await screenshot.scrollIntoViewIfNeeded();
    await expect(screenshot).toHaveAttribute('alt', /.+/);
    await expect.poll(() => screenshot.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(screenshot).toHaveCSS('object-fit', 'cover');
  }

  const expectedCallouts = [
    { alt: '商品资料与规格价格配置示例', positions: [[25, 16], [37, 27]] },
    { alt: '采购订单与采购入库页面示例', positions: [[92, 11], [80, 33]] },
    { alt: '销售订单与销售出库页面示例', positions: [[92, 11], [76, 33]] },
    { alt: '库存查询与调拨盘点页面示例', positions: [[47, 21], [45, 37], [94, 11]] },
    { alt: '独立站可视化设计页面示例', positions: [[12, 34], [54, 49], [88, 35]] },
    { alt: '独立站线索池页面示例', positions: [[58, 20], [47, 33], [92, 55]] },
    { alt: '经营概览与财务复盘页面示例', positions: [[58, 27], [58, 43], [63, 67]] },
  ];
  for (const expected of expectedCallouts) {
    const figure = page.getByRole('img', { name: expected.alt }).locator('..').locator('..');
    const callouts = figure.getByTestId('screenshot-callout');
    await expect(callouts).toHaveCount(expected.positions.length);
    for (let index = 0; index < expected.positions.length; index += 1) {
      const [left, top] = expected.positions[index];
      await expect(callouts.nth(index)).toHaveAttribute('style', `left: ${left}%; top: ${top}%;`);
    }
  }
});

test('help icon opens the manual in a new tab without changing the business page', async ({ page }) => {
  await installIdentity(page, 'member', ['menu.dashboard', 'page.dashboard']);
  await page.goto('/dashboard');
  const originalUrl = page.url();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: '打开使用手册' }).click();
  const manual = await popupPromise;
  await manual.waitForLoadState('domcontentloaded');
  await expect(manual).toHaveURL(/\/help$/);
  await expect(manual.getByTestId('standalone-help')).toBeVisible();
  expect(page.url()).toBe(originalUrl);
});

test('mobile training directory opens as a drawer', async ({ page }) => {
  await installIdentity(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/help');
  await expect(page.getByTestId('manual-directory')).toBeHidden();
  await page.getByRole('button', { name: '打开培训目录' }).click();
  const mobileDirectory = page.getByRole('navigation', { name: '移动端培训手册目录' });
  await expect(mobileDirectory).toBeVisible();
  await mobileDirectory.getByRole('button', { name: /独立站上线/ }).click();
  await expect(page).toHaveURL(/#storefront-launch$/);
  await expect(mobileDirectory).toBeHidden();
});

test('unauthenticated and system-admin identities cannot enter tenant help', async ({ page }) => {
  await page.goto('/help');
  await expect(page).toHaveURL(/\/login$/);

  await installIdentity(page, 'system_admin');
  await page.goto('/help');
  await expect(page).toHaveURL(/\/system\/overview$/);
});
