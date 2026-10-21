import { expect, test } from '@playwright/test';

const tokenFor = (issuedAt: number, expiresAt: number) => {
  const payload = Buffer.from(JSON.stringify({ iat: issuedAt, exp: expiresAt })).toString('base64url');
  return `e2e.${payload}.signature`;
};

test('expired session is cleared and redirected with a re-login notice', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('mercivo_access_token', token);
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.dashboard'] }));
  }, { token: tokenFor(now - 90_000, now + 10_000) });

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('登录已失效，请重新登录')).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    token: localStorage.getItem('mercivo_access_token'),
    user: localStorage.getItem('mercivo_user'),
    tenant: localStorage.getItem('mercivo_tenant'),
  }))).toEqual({ token: null, user: null, tenant: null });
});

test('authenticated API 401 redirects once without showing a duplicate server error', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('mercivo_access_token', token);
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.dashboard'] }));
  }, { token: tokenFor(now, now + 86_400) });
  await page.route('**/api/v1/**', route => route.fulfill({ status: 401, json: { message: '未授权' } }));

  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('登录已失效，请重新登录')).toHaveCount(1);
  await expect(page.getByText('未授权')).toHaveCount(0);
});

test('an open page redirects when the absolute expiry time is reached', async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('mercivo_access_token', token);
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'member' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.dashboard'] }));
  }, { token: tokenFor(now, now + 2) });

  await page.goto('/help');
  await expect(page).toHaveURL(/\/help$/);
  await expect(page).toHaveURL(/\/login$/, { timeout: 5_000 });
  await expect(page.getByRole('alert')).toHaveText('登录已失效，请重新登录');
});
