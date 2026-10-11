import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('uploaded relative image URLs are not rewritten as Unsplash IDs', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/shared/ProductImage.tsx'), 'utf8');
  const adminProxy = readFileSync(resolve(process.cwd(), '../deploy/cloudrun/admin.runtime.nginx.conf.template'), 'utf8');
  expect(component).toContain("https?:|data:|blob:|\\/");
  expect(component).toContain('https://images.unsplash.com/');
  expect(adminProxy).toContain('location ^~ /api/');
});
