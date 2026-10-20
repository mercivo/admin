import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSources = ['CustomerLevels', 'Inventory', 'Sales', 'Purchase', 'Finance']
  .map(name => resolve(process.cwd(), 'src', 'pages', name, 'index.tsx'));

test('list pages do not impose a fixed delay on every load', () => {
  for (const path of pageSources) {
    const source = readFileSync(path, 'utf8');
    expect(source, `${path} should debounce keyword changes only`).not.toMatch(/setTimeout\([^\n]+,\s*250\)/);
    expect(source).toContain('previousKeyword.current === keyword ? 0 : 250');
  }
});

test('application shell uses narrow shared-component imports', () => {
  for (const name of ['AdminLayout.tsx', 'DemoNav.tsx']) {
    const source = readFileSync(resolve(process.cwd(), 'src', 'components', 'layout', name), 'utf8');
    expect(source).not.toMatch(/from ["']\.\.\/shared["']/);
  }
});

test('login and dashboard keep route-only dependencies out of their initial chunks', () => {
  const app = readFileSync(resolve(process.cwd(), 'src', 'App.tsx'), 'utf8');
  const login = readFileSync(resolve(process.cwd(), 'src', 'pages', 'Login', 'index.tsx'), 'utf8');
  const dashboard = readFileSync(resolve(process.cwd(), 'src', 'pages', 'Dashboard', 'index.tsx'), 'utf8');

  expect(app).toContain('lazy(() => import("./components/layout/AdminLayout"))');
  expect(app).toContain('lazy(() => import("./components/layout/DemoNav"))');
  expect(login).not.toMatch(/from ['"]\.\.\/\.\.\/components\/shared['"]/);
  expect(login).toContain("import('../../services/api')");
  expect(dashboard).not.toMatch(/from ['"]\.\.\/\.\.\/components\/shared['"]/);
  expect(dashboard).toContain("lazy(() => import('./OrderTrendChart'))");
  expect(dashboard).toContain("lazy(() => import('./CategoryDonutChart'))");
});
