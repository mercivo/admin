import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const path = resolve(directory, name);
  return statSync(path).isDirectory() ? sourceFiles(path) : /\.(tsx|ts)$/.test(path) ? [path] : [];
});

test('all admin business dialogs use the shared AppModal component', () => {
  const root = resolve(process.cwd(), 'src');
  const exceptions = new Set([resolve(root, 'components/shared/AppModal.tsx')]);
  const violations = sourceFiles(root).filter(path => {
    if (exceptions.has(path)) return false;
    const source = readFileSync(path, 'utf8');
    return /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]antd['"]/.test(source)
      || /fixed\s+inset-0[^"']*(?:z-\d+)?[^"']*bg-black/.test(source)
      || /createPortal\s*\(/.test(source);
  });
  expect(violations).toEqual([]);
});

test('all storefront dialogs use the shared StorefrontModal component', () => {
  const root = resolve(process.cwd(), '../storefront/src');
  const exceptions = new Set([resolve(root, 'StorefrontModal.tsx')]);
  const violations = sourceFiles(root).filter(path => {
    if (exceptions.has(path)) return false;
    const source = readFileSync(path, 'utf8');
    return /import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*['"]antd['"]/.test(source)
      || /(?:contact-modal|customer-login-modal)["']\s+role=["']dialog/.test(source)
      || /createPortal\s*\(/.test(source);
  });
  expect(violations).toEqual([]);
});

test('shared modal wrappers enforce the common shell and allow business widths', () => {
  const adminModal = readFileSync(resolve(process.cwd(), 'src/components/shared/AppModal.tsx'), 'utf8');
  expect(adminModal).toContain('centered');
  expect(adminModal).toContain('destroyOnHidden');
  expect(adminModal).toContain("className={`app-modal");
  expect(adminModal).toContain('width: 440');
  expect(adminModal).toContain('app-modal-heading');

  const storefrontModal = readFileSync(resolve(process.cwd(), '../storefront/src/StorefrontModal.tsx'), 'utf8');
  expect(storefrontModal).toContain('centered');
  expect(storefrontModal).toContain('destroyOnHidden');
  expect(storefrontModal).toContain("className={`storefront-modal");
  expect(storefrontModal).toContain('storefront-modal-heading');

  const consumers = [
    'pages/CustomerLevels/index.tsx',
    'pages/ProductCategories/index.tsx',
    'pages/ProductDetail/index.tsx',
    'pages/ProductEdit/index.tsx',
    'pages/Products/index.tsx',
    'pages/Settings/index.tsx',
    'pages/SystemAdmin/index.tsx',
  ];
  for (const consumer of consumers) {
    expect(readFileSync(resolve(process.cwd(), 'src', consumer), 'utf8'), consumer).toContain('AppModal');
  }
  expect(readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/controls.tsx'), 'utf8')).toContain('<AppModal');
});

test('product preview, delete and batch dialogs render through the unified shell', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('mercivo_access_token', 'modal-e2e-token');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: ['page.products', 'product.edit', 'product.delete'] }));
  });
  const product = {
    id: 'product-1', nameZh: '统一弹窗验收商品', nameEn: 'Modal acceptance product', sku: 'MODAL-001',
    price: 'CNY 10.00', basePrice: 10, stock: 100, moq: 10, status: 'published', category: 'bags', img: '',
    hot: false, badge: '', likeCount: 0, description: '用于弹窗验收', tags: [], variants: [], levelPrices: {},
  };
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: ['page.products', 'product.edit', 'product.delete'] } } });
    if (url.includes('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (url.includes('/product')) return route.fulfill({ json: { data: [product] } });
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('http://localhost:8088/products');

  await page.getByRole('button', { name: '预览' }).click();
  const preview = page.getByRole('dialog', { name: /\u7edf\u4e00弹窗验收商品/ });
  const previewShell = page.locator('.ant-modal.app-modal');
  await expect(previewShell).toBeVisible();
  await expect(previewShell).toHaveCSS('width', '680px');
  await expect(previewShell.locator('.ant-modal-content')).toHaveCSS('max-height', '648px');
  await expect(previewShell.locator('.ant-modal-content')).toHaveCSS('padding', '0px');
  await expect(previewShell.locator('.ant-modal-body')).toHaveCSS('overflow-y', 'auto');
  await expect(previewShell.locator('.ant-modal-header')).toHaveCSS('border-bottom-style', 'solid');
  await expect(previewShell.locator('.ant-modal-header')).toHaveCSS('align-items', 'center');
  await expect(preview.locator('.ant-modal-footer')).toHaveCSS('display', 'flex');
  await expect(preview.locator('.ant-modal-footer')).toHaveCSS('justify-content', 'flex-end');
  await preview.getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: '删除' }).click();
  const deletion = page.getByRole('dialog', { name: '确认删除商品' });
  const deletionShell = page.locator('.ant-modal.app-modal');
  await expect(deletionShell).toBeVisible();
  await expect(deletionShell).toHaveCSS('width', '440px');
  await expect(deletionShell.locator('.ant-modal-body')).toHaveCSS('padding', '20px 24px');
  await expect(deletionShell.locator('.ant-modal-footer')).toHaveCSS('padding', '16px 24px');
  await deletion.getByRole('button', { name: /\u53d6\s*消/ }).click();

  await page.locator('tbody input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: '批量下架' }).click();
  const batch = page.getByRole('dialog', { name: '批量下架商品' });
  await expect(page.locator('.ant-modal.app-modal')).toBeVisible();
  await expect(batch.locator('.ant-modal-footer')).toHaveCSS('gap', '8px');
});

test('storefront customer and contact dialogs use the same shared shell', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-modal', versionId: 'version-modal', version: 1,
    site: { name: '弹窗验收站点', slug: 'modal-site', defaultLanguage: 'zh', supportedLanguages: ['zh'], defaultCurrency: 'CNY', guestPriceMode: 'base' },
    customer: null,
    config: { themeColor: '#7C6EF5', siteInfo: {
      contactModalTitle: '联系我们', contactModalSubtitle: '获取产品与报价信息',
      contactDetails: { email: 'sales@example.com', phone: '+86 138 0000 0000', whatsapp: '', address: '上海', hours: '工作日 09:00–18:00' },
      socialLinks: [],
    } },
    products: [], categories: [], testimonials: [],
  } } }));
  await page.goto('http://localhost:8080/?site=modal-site');

  await page.getByRole('button', { name: '客户识别' }).click();
  const login = page.getByRole('dialog', { name: /客户识别/ });
  await expect(page.locator('.ant-modal.storefront-modal')).toHaveCSS('width', '430px');
  await expect(page.locator('.ant-modal.storefront-modal .ant-modal-content')).toHaveCSS('max-height', '648px');
  await expect(page.locator('.ant-modal.storefront-modal .ant-modal-content')).toHaveCSS('padding', '0px');
  await expect(page.locator('.ant-modal.storefront-modal .ant-modal-body')).toHaveCSS('overflow-y', 'auto');
  await expect(page.locator('.ant-modal.storefront-modal .ant-modal-header')).toHaveCSS('border-bottom-style', 'solid');
  await expect(page.locator('.ant-modal.storefront-modal .ant-modal-header')).toHaveCSS('align-items', 'center');
  await expect(login.locator('.ant-modal-footer')).toHaveCSS('display', 'flex');
  await expect(login.locator('.ant-modal-footer')).toHaveCSS('justify-content', 'flex-end');
  await login.getByRole('button', { name: /Close|关闭/ }).click();

  await page.getByRole('button', { name: '查看联系方式' }).click();
  const contact = page.getByRole('dialog', { name: /联系我们/ });
  await expect(page.locator('.ant-modal.storefront-modal')).toHaveCSS('width', '460px');
  await expect(contact.getByText('sales@example.com')).toBeVisible();
  await expect(contact.locator('.ant-modal-footer')).toHaveCount(0);
});
