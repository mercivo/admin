import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { availableProductVariantValues, productVariantValue } from '../src/utils/productVariant';

test('only currently available product and specification keys are retained', () => {
  const values = availableProductVariantValues([
    {
      id: 'product-with-variants',
      variants: [
        { id: 'red', specification: '颜色', option: '红色', stock: 0, surcharge: 0 },
        { id: 'blue', specification: '颜色', option: '蓝色', stock: 0, surcharge: 0 },
      ],
    },
    { id: 'base-product', variants: [] },
  ] as never);

  expect(values.has(productVariantValue('product-with-variants', 'red'))).toBe(true);
  expect(values.has(productVariantValue('product-with-variants', 'deleted-spec'))).toBe(false);
  expect(values.has(productVariantValue('deleted-product', 'BASE'))).toBe(false);
  expect(values.has(productVariantValue('base-product', 'BASE'))).toBe(true);
});

test('product editing and galleries support up to ten images', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/ProductEdit/index.tsx'), 'utf8');
  const gallery = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductGallery.tsx'), 'utf8');
  const preview = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductImagePreview.tsx'), 'utf8');
  const tableCell = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductTableCell.tsx'), 'utf8');
  const products = readFileSync(resolve(process.cwd(), 'src/pages/Products/index.tsx'), 'utf8');
  const renderer = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/SiteRenderer.tsx'), 'utf8');
  const entity = readFileSync(resolve(process.cwd(), '../backend/src/modules/product/product.entity.ts'), 'utf8');
  expect(editor).toContain('multiple accept="image/jpeg,image/png,image/webp,image/gif"');
  expect(editor).toContain('slice(0, 10)');
  expect(gallery).toContain('aria-label="商品图片缩略图"');
  expect(gallery).toContain('setActive(index)');
  expect(gallery).toContain('<ProductImagePreview');
  expect(editor).toContain('<ProductImagePreview images={images}');
  expect(tableCell).toContain('<ProductImagePreview');
  expect(products).toContain('<ProductImagePreview');
  expect(preview).toContain("maxHeight: 'calc(100vh - 150px)'");
  expect(preview).toContain('absolute inset-0 h-full w-full min-h-0 min-w-0 object-contain');
  expect(preview).toContain('className="h-full w-full min-h-0 min-w-0 object-contain"');
  expect(renderer).toContain('onNavigate(String(product.id))');
  expect(renderer).toContain('<ProductGallery images={product.images}');
  expect(entity).toContain('images: string[] | null');
});

test('product badges render their shared display names in previews', () => {
  const labels = readFileSync(resolve(process.cwd(), 'src/components/shared/productBadge.ts'), 'utf8');
  const products = readFileSync(resolve(process.cwd(), 'src/pages/Products/index.tsx'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), 'src/pages/Storefront/index.tsx'), 'utf8');
  expect(labels).toContain("hot: '爆品'");
  expect(labels).toContain("bestseller: '热销'");
  expect(products).toContain('{productBadgeLabel(product)}');
  expect(storefront).toContain('productBadgeLabels[preview.badge]');
});

test('editable product-spec tables use wider cells and readable popups', () => {
  const table = readFileSync(resolve(process.cwd(), 'src/components/shared/AppTable.tsx'), 'utf8');
  const styles = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
  const purchase = readFileSync(resolve(process.cwd(), 'src/pages/Purchase/index.tsx'), 'utf8');
  const sales = readFileSync(resolve(process.cwd(), 'src/pages/Sales/index.tsx'), 'utf8');
  const inventory = readFileSync(resolve(process.cwd(), 'src/pages/Inventory/index.tsx'), 'utf8');
  expect(table).toContain('? 360 : undefined');
  expect(styles).toContain('vertical-align: middle');
  for (const source of [purchase, sales]) {
    expect(source).toContain('popupMatchSelectWidth={520}');
    expect(source).toContain('listHeight={320}');
    expect(source).toContain('rowKey="clientId"');
    expect(source).toContain('product-spec-dropdown');
    expect(source).toContain('availableProductVariantValues(productRows)');
    expect(source).toContain('? line.productId');
    expect(source).toContain(': ""');
    expect(source).toContain('productOptions.some(');
  }
  expect(inventory).toContain('product-spec-dropdown');
});

test('order detail tables use modal scrolling and cancelled orders can reopen the shared editor', () => {
  const purchase = readFileSync(resolve(process.cwd(), 'src/pages/Purchase/index.tsx'), 'utf8');
  const sales = readFileSync(resolve(process.cwd(), 'src/pages/Sales/index.tsx'), 'utf8');
  for (const source of [purchase, sales]) {
    expect(source).toContain('scroll={{ x: "totalAmount" in detail ? 1000 : 690 }}');
    expect(source).not.toContain('scroll={{ x: 680, y: 320 }}');
    expect(source).toContain('title="重新编辑"');
    expect(source).toContain('orderDraft.id');
  }
  expect(purchase).toContain('unitPrice: Number(line.unitPrice)');
  expect(purchase).toContain('taxAmount: Number(orderDraft.taxAmount || 0)');
});
