import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = (page: string) => readFileSync(resolve(process.cwd(), `src/pages/${page}/index.tsx`), 'utf8');

test('shared tenant modules scope pagination to the current route before requesting data', () => {
  for (const page of ['Inventory', 'Sales', 'Purchase', 'Finance']) {
    const source = pageSource(page);
    expect(source, `${page} must reset pagination synchronously when its route module changes`).toContain('useTablePagination(module)');
    expect(source, `${page} must not rely on a post-render module reset`).not.toMatch(/pagination\.reset\(\);?\s*\}\s*,\s*\[module/);
  }
});

test('shared tenant modules ignore responses from an obsolete route module', () => {
  for (const page of ['Inventory', 'Sales', 'Purchase', 'Finance']) {
    const source = pageSource(page);
    expect(source, `${page} must track the latest list request`).toContain('listRequestRef');
    expect(source, `${page} must compare responses with the latest request`).toContain('requestId !== listRequestRef.current');
    expect(source, `${page} must bind completion state to the requested module`).toContain('setLoadedModule(requestedModule)');
  }
});

