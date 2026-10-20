import { expect, test } from '@playwright/test';

const storefrontBaseUrl = process.env.STOREFRONT_BASE_URL || 'http://localhost:8080';

for (const scenario of [
  { code: 'SITE_PLAN_EXPIRED', title: '套餐已过期', description: '请联系站点管理员续费后再访问。' },
  { code: 'SITE_PUBLISH_PERMISSION_REQUIRED', title: '暂无独立站发布权限', description: '请联系站点管理员升级套餐后再访问。' },
]) {
  test(`storefront renders the localized ${scenario.code} notice without site content`, async ({ page }) => {
    await page.route('**/api/v1/public/site**', route => route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ code: 403, errorCode: scenario.code, data: { locale: 'zh_CN', title: scenario.title, description: scenario.description }, message: 'Forbidden' }),
    }));

    await page.goto(`${storefrontBaseUrl}/?site=blocked-site&lang=zh_CN`);
    const alert = page.getByRole('alert');
    await expect(alert.getByRole('heading', { name: scenario.title })).toBeVisible();
    await expect(alert.getByText(scenario.description, { exact: true })).toBeVisible();
    await expect(alert.locator(':scope > *')).toHaveCount(2);
    await expect(alert.locator('svg, button, small')).toHaveCount(0);
    await expect(page.getByText('如果您是站点管理员，请在后台检查域名绑定、商户权限及发布状态。', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '重新加载' })).toHaveCount(0);
    await expect(page.getByText('由 Mercivo 提供技术支持', { exact: true })).toHaveCount(0);
    await expect(page.locator('.unavailable-brand')).toHaveCount(0);
    await expect(page.locator('.site-access-notice')).toHaveCSS('border-radius', '24px');
    await expect(page.locator('.site-access-notice')).toHaveCSS('text-align', 'center');
    await expect(page.locator('.site-access-notice-page')).toHaveCSS('background-image', /radial-gradient/);
    await expect(page.locator('.site-renderer-root')).toHaveCount(0);
    await expect(page.locator('.product')).toHaveCount(0);
  });
}
