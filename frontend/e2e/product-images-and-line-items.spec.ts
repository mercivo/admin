import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('product editing and galleries support up to ten images', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/ProductEdit/index.tsx'), 'utf8');
  const gallery = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductGallery.tsx'), 'utf8');
  const renderer = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/SiteRenderer.tsx'), 'utf8');
  const entity = readFileSync(resolve(process.cwd(), '../backend/src/modules/product/product.entity.ts'), 'utf8');
  expect(editor).toContain('multiple accept="image/jpeg,image/png,image/webp,image/gif"');
  expect(editor).toContain('slice(0, 10)');
  expect(gallery).toContain('aria-label="商品图片缩略图"');
  expect(gallery).toContain('setActive(index)');
  expect(renderer).toContain('onNavigate(String(product.id))');
  expect(renderer).toContain('<ProductGallery images={productDetail.images}');
  expect(entity).toContain('images: string[] | null');
});

test('editable product-spec tables use wider cells and readable popups', () => {
  const table = readFileSync(resolve(process.cwd(), 'src/components/shared/AppTable.tsx'), 'utf8');
  const styles = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
  const purchase = readFileSync(resolve(process.cwd(), 'src/pages/Purchase/index.tsx'), 'utf8');
  const sales = readFileSync(resolve(process.cwd(), 'src/pages/Sales/index.tsx'), 'utf8');
  const inventory = readFileSync(resolve(process.cwd(), 'src/pages/Inventory/index.tsx'), 'utf8');
  expect(table).toContain('? 360 : undefined');
  expect(styles).toContain('vertical-align: middle');
  for (const source of [purchase, sales, inventory]) {
    expect(source).toContain('popupMatchSelectWidth={false}');
    expect(source).toContain('product-spec-dropdown');
  }
});
