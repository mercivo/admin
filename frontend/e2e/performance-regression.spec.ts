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
