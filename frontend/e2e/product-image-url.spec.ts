import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('uploaded relative image URLs are not rewritten as Unsplash IDs', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductImage.tsx'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');
  const adminProxy = readFileSync(resolve(process.cwd(), '../deploy/cloudrun/admin.runtime.nginx.conf.template'), 'utf8');
  expect(component).toContain("https?:|data:|blob:|\\/");
  expect(component).toContain('https://images.unsplash.com/');
  expect(component).toContain('fit=max');
  expect(component).not.toContain('fit=crop');
  expect(component).toContain('https://storage.googleapis.com/mercivo-images-753805870951/');
  expect(storefront).toContain('https://storage.googleapis.com/mercivo-images-753805870951/');
  expect(component).toContain("objectFit: 'contain'");
  expect(component).toContain("objectPosition: 'center'");
  expect(adminProxy).toContain('location ^~ /api/');
});

test('product images stay fully visible and centered in the storefront', () => {
  const styles = readFileSync(resolve(process.cwd(), '../storefront/src/styles.css'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');
  expect(styles).toContain('.product-image{background:#fff}.product-image img{object-fit:contain;object-position:center}');
  expect(styles).toContain('.product:hover .product-image img{transform:none}');
  expect(storefront).toContain('fit=max');
  expect(storefront).not.toContain('fit=crop');
});

test('all admin product image surfaces use the shared contain renderer', () => {
  const productImage = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductImage.tsx'), 'utf8');
  const productDetail = readFileSync(resolve(process.cwd(), 'src/pages/ProductDetail/index.tsx'), 'utf8');
  const gallery = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductGallery.tsx'), 'utf8');
  expect(productImage).toContain("backgroundColor: '#fff'");
  expect(productImage).toContain("objectFit: 'contain'");
  expect(productImage).toContain("objectPosition: 'center'");
  expect(productDetail).toContain('<ProductImage image={p.img}');
  expect(productDetail).not.toContain('fit=crop');
  expect(gallery).toContain('<ProductImagePreview');
});
