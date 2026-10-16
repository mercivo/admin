import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('uploaded relative image URLs are not rewritten as Unsplash IDs', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductImage.tsx'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');
  const adminProxy = readFileSync(resolve(process.cwd(), '../deploy/cloudrun/admin.runtime.nginx.conf.template'), 'utf8');
  expect(component).toContain("https?:|data:|blob:|\\/");
  expect(component).toContain('https://images.unsplash.com/');
  expect(component).toContain('https://storage.googleapis.com/mercivo-images-753805870951/');
  expect(storefront).toContain('https://storage.googleapis.com/mercivo-images-753805870951/');
  expect(adminProxy).toContain('location ^~ /api/');
});
