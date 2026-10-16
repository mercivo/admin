import { expect, test } from '@playwright/test';

test('translation constants use the final tab and a single description-free card', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({
      permissions: ['page.site.editor', 'page.site.translations', 'site.translation.edit'],
    }));
  });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/workspace/settings')) {
      return route.fulfill({ json: { data: { site: { defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN', 'en_US'] } } } });
    }
    if (url.pathname.endsWith('/translations')) {
      const items = url.searchParams.get('resourceType') === 'constant' ? [
        { key: 'constant:product.moq', resourceType: 'constant', resourceId: 'product', sourceText: '最低起订量', contentFormat: 'text', required: true, value: '', status: 'missing', updatedAt: '2026-10-15T00:00:00.000Z' },
        { key: 'constant:product.badges', resourceType: 'constant', resourceId: 'product', sourceText: '新品;爆品;热销;推荐', contentFormat: 'text', required: true, value: '', status: 'missing', updatedAt: '2026-10-15T00:00:00.000Z' },
      ] : [];
      return route.fulfill({ json: { data: { items, total: items.length, page: 1, pageSize: 200, locale: 'en_US', summary: [{ locale: 'en_US', total: items.length, completed: 0, stale: 0, missing: items.length, percent: 0 }] } } });
    }
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto('http://localhost:8088/storefront-translations');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveText(['商品信息', '商品分类', '站点设计', '系统文案', '常量']);
  expect(await page.locator('.translation-tabs .ant-tabs-tab').first().evaluate(element => getComputedStyle(element).paddingBottom)).toBe('7px');

  await page.getByRole('tab', { name: '常量', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '常量', exact: true })).toBeVisible();
  await expect(page.getByText('统一维护最低起订量文案与四个固定商品标记')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '最低起订量中文原文', exact: true })).toHaveValue('最低起订量');
  await expect(page.getByRole('textbox', { name: '商品标记中文原文', exact: true })).toHaveValue('新品;爆品;热销;推荐');
  await expect(page.getByRole('textbox', { name: '商品标记译文', exact: true })).toHaveAttribute('placeholder', '多个内容请用分号 ; 分隔');
});
