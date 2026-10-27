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
  const permissions = ['group.products', 'menu.products', 'page.products', 'product.edit', 'product.delete', 'product.publish'];
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: value }));
  }, permissions);
  const product = {
    id: 'product-1', nameZh: '统一弹窗验收商品', sku: 'MODAL-001',
    price: 'CNY 10.00', basePrice: 10, stock: 100, moq: 10, status: 'published', category: 'bags', img: '',
    hot: false, badge: '', likeCount: 0, description: '用于弹窗验收', tags: [], variants: [], levelPrices: {},
  };
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/product-categories')) return route.fulfill({ json: { data: [{ code: 'bags', label: '箱包', sort: 1, status: 'enabled', remark: '', children: [] }] } });
    if (url.includes('/product')) return route.fulfill({ json: { data: { items: [product], total: 1, page: 1, pageSize: 20, summary: { categoryCounts: { bags: 1 }, totalProducts: 1 } } } });
    return route.fulfill({ json: { data: {} } });
  });
  await page.goto('http://localhost:8088/products');

  await page.getByRole('button', { name: '预览', exact: true }).click();
  const preview = page.getByRole('dialog', { name: /\u7edf\u4e00弹窗验收商品/ });
  const previewShell = page.locator('.ant-modal.app-modal');
  await expect(previewShell).toBeVisible();
  await expect(previewShell).toHaveCSS('width', '780px');
  await expect(previewShell.locator('.ant-modal-content')).toHaveCSS('max-height', '648px');
  await expect(previewShell.locator('.ant-modal-content')).toHaveCSS('padding', '0px');
  await expect(previewShell.locator('.ant-modal-body')).toHaveCSS('overflow-y', 'auto');
  await expect(previewShell.locator('.ant-modal-header')).toHaveCSS('border-bottom-style', 'solid');
  await expect(previewShell.locator('.ant-modal-header')).toHaveCSS('align-items', 'center');
  await expect(preview.locator('.ant-modal-footer')).toHaveCSS('display', 'flex');
  await expect(preview.locator('.ant-modal-footer')).toHaveCSS('justify-content', 'flex-end');
  await preview.getByRole('button', { name: '关 闭' }).click();

  await page.getByRole('button', { name: '删除' }).click();
  const deletion = page.getByRole('dialog', { name: '确认删除商品' });
  const deletionShell = page.locator('.ant-modal.app-modal');
  await expect(deletionShell).toBeVisible();
  await expect(deletionShell).toHaveCSS('width', '440px');
  await expect(deletionShell.locator('.ant-modal-body')).toHaveCSS('padding', '20px 24px');
  await expect(deletionShell.locator('.ant-modal-footer')).toHaveCSS('padding', '16px 24px');
  await deletion.getByRole('button', { name: /\u53d6\s*消/ }).click();

  await page.locator('tr[data-row-key="product-1"] .ant-checkbox-input').evaluate((element: HTMLInputElement) => element.click());
  await expect(page.getByText('已选 1 项', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消同步' }).click();
  const batch = page.getByRole('dialog', { name: '批量取消同步' });
  await expect(page.locator('.ant-modal.app-modal')).toBeVisible();
  await expect(batch.locator('.ant-modal-footer')).toHaveCSS('gap', '8px');
});

test('storefront contact dialog reuses the desktop canvas contact modal', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-modal', versionId: 'version-modal', version: 1,
    site: { name: '弹窗验收站点', slug: 'modal-site', defaultLanguage: 'en_US', supportedLanguages: ['en_US'], defaultCurrency: 'CNY', guestPriceMode: 'base' },
    customer: null,
    config: { themeColor: '#7C6EF5', siteInfo: {
      contactModalTitle: '联系我们', contactModalSubtitle: '获取产品与报价信息',
      contactLabels: { email: '业务邮箱', phone: '联系电话', whatsapp: '即时沟通', address: '联系地址', hours: '工作时间' },
      contactDetails: { email: 'sales@example.com', phone: '+86 138 0000 0000', whatsapp: '', address: '上海', hours: '工作日 09:00-18:00' },
      contactItems: [{ id: 'email-item', label: '业务邮箱', content: 'sales@example.com' }, { id: 'address-item', label: '联系地址', content: '上海' }, { id: 'empty-item', label: '备用联系', content: '' }],
      socialLinks: [],
    } },
    i18n: { messages: { en_US: { 'editor:siteInfo:contactModalTitle': 'Contact us', 'editor:siteInfo:contact:email-item:label': 'Business email', 'editor:siteInfo:contact:email-item:content': 'global@example.com', 'editor:siteInfo:contact:address-item:label': 'Office address', 'editor:siteInfo:contact:address-item:content': 'Shanghai office' } } },
    products: [], categories: [], testimonials: [],
  } } }));
  await page.goto('http://localhost:8080/?site=modal-site');

  await page.getByRole('button', { name: '获取报价' }).click();
  const contact = page.getByRole('dialog', { name: /Contact us/ });
  await expect(page.locator('.ant-modal.app-modal')).toHaveCSS('width', '520px');
  await expect(page.locator('.ant-modal.app-modal .ant-modal-content')).toHaveCSS('max-height', '648px');
  await expect(page.locator('.ant-modal.app-modal .ant-modal-content')).toHaveCSS('padding', '0px');
  await expect(page.locator('.ant-modal.app-modal .ant-modal-body')).toHaveCSS('overflow-y', 'auto');
  await expect(page.locator('.ant-modal.app-modal .ant-modal-header')).toHaveCSS('border-bottom-style', 'solid');
  await expect(contact.locator('.editor-contact-preview')).toBeVisible();
  await expect(contact.getByText('Business email', { exact: true })).toBeVisible();
  await expect(contact.getByText('global@example.com', { exact: true })).toBeVisible();
  await expect(contact.getByText('Office address', { exact: true })).toBeVisible();
  await expect(contact.getByText('Shanghai office', { exact: true })).toBeVisible();
  await expect(contact.getByText('-', { exact: true })).toBeVisible();
  await expect(contact.locator('.ant-modal-footer')).toHaveCount(0);
});

test('storefront footer renders every social link in a new window and configured copyright', async ({ page }) => {
  await page.route('**/api/v1/public/site**', route => route.fulfill({ json: { data: {
    siteId: 'site-footer', versionId: 'version-footer', version: 1,
    site: { name: '页脚验收站点', slug: 'footer-site', defaultLanguage: 'zh_CN', supportedLanguages: ['zh_CN'], defaultCurrency: 'CNY', guestPriceMode: 'base' },
    customer: null,
    config: {
      themeColor: '#7C6EF5',
      siteInfo: { contactItems: [{ id: 'email', label: '业务邮箱', content: 'very-long-sales-address@example.com' }, { id: 'phone', label: '联系电话', content: '13800000000' }], contactDetails: {} },
      pages: { home: { sections: [{
        id: 'footer-1', type: 'footer', visible: true, title: '测试企业', subtitle: '企业说明',
        copyrightText: '© 2026 测试企业. All rights reserved.',
        navItems: [{ id: 'nav-1', label: '内容较长的产品中心导航', targetId: 'products-1' }, { id: 'nav-2', label: '联系我们', targetId: 'form-1' }],
        socialLinks: [
          { id: 'linkedin', label: '领英', url: 'https://linkedin.example' },
          { id: 'facebook', label: 'Facebook', url: 'https://facebook.example' },
          { id: 'empty-name', label: '', url: 'https://empty-name.example' },
        ],
      }] } },
    },
    i18n: { messages: { zh_CN: {} } }, products: [], categories: [], testimonials: [],
  } } }));
  await page.goto('http://localhost:8080/?site=footer-site');

  const footer = page.locator('[data-section-type="footer"]');
  const socials = footer.locator('a[target="_blank"]');
  await expect(socials).toHaveCount(2);
  await expect(socials.nth(0)).toHaveAttribute('href', 'https://linkedin.example');
  await expect(socials.nth(1)).toHaveAttribute('href', 'https://facebook.example');
  await expect(socials.nth(0)).toHaveAttribute('target', '_blank');
  await expect(socials.nth(1)).toHaveAttribute('rel', /noreferrer/);
  await expect(footer.locator('a[href="https://empty-name.example"]')).toHaveCount(0);
  await expect(footer.getByText('© 2026 测试企业. All rights reserved.', { exact: true })).toBeVisible();

  const details = footer.locator('footer > div > div').nth(1);
  const navigationHeading = await details.getByText('快速导航', { exact: true }).boundingBox();
  const contactHeading = await details.getByText('联系我们', { exact: true }).first().boundingBox();
  const navigationText = await details.getByText('内容较长的产品中心导航', { exact: true }).boundingBox();
  const contactText = await details.getByText('业务邮箱：very-long-sales-address@example.com', { exact: true }).boundingBox();
  expect(navigationHeading!.y).toBe(contactHeading!.y);
  expect(navigationText!.y).toBe(contactText!.y);
  expect(navigationText!.x).toBe(navigationHeading!.x);
  expect(contactText!.x).toBe(contactHeading!.x);
  expect((await details.getByText('联系我们', { exact: true }).last().boundingBox())!.y).toBe((await details.getByText('联系电话：13800000000', { exact: true }).boundingBox())!.y);
});
