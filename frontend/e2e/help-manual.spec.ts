import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'member', account: 'member@example.com', name: '普通成员' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ name: '测试企业', permissions: [] }));
  });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: { permissions: [] } } }));
});

test('help replaces global search and is accessible without feature permissions', async ({ page }) => {
  await page.goto('/help');

  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole('heading', { name: '使用手册', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('搜索商品、客户或站点...')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '打开使用手册' })).toBeVisible();

  const directory = page.getByRole('navigation', { name: '使用手册目录' });
  for (const item of ['商品列表', '销售订单', '采购入库', '库存调拨', '站点设计', '多语言内容', '财务统计', '成员与权限']) {
    await expect(directory.getByRole('button', { name: item, exact: true })).toBeVisible();
  }

  const sidebarBox = await directory.boundingBox();
  const contentBox = await page.locator('main').last().boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(sidebarBox!.x + sidebarBox!.width).toBeLessThan(contentBox!.x);

  await directory.getByRole('button', { name: '库存调拨', exact: true }).click();
  await expect(page).toHaveURL(/#inventory-transfers$/);
  await expect(page.locator('#inventory-transfers')).toBeInViewport();
});
