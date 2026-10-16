import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(process.cwd(), 'src');
const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const path = resolve(directory, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(?:ts|tsx)$/.test(name) ? [path] : [];
});

test('only system settings can persist the common default currency', () => {
  const writers = sourceFiles(sourceRoot).filter(path =>
    /updateConfig(?:<[^>]+>)?\(["']currency["']/.test(readFileSync(path, 'utf8')),
  );
  expect(writers).toEqual([resolve(sourceRoot, 'pages/SystemSettings/index.tsx')]);

  const workspaceApi = readFileSync(resolve(sourceRoot, 'services/api/index.ts'), 'utf8');
  const updateSiteBlock = workspaceApi.slice(workspaceApi.indexOf('updateSite:'), workspaceApi.indexOf('getConfig:', workspaceApi.indexOf('updateSite:')));
  expect(updateSiteBlock).not.toContain('defaultCurrency');

  const dashboard = readFileSync(resolve(sourceRoot, 'pages/Dashboard/index.tsx'), 'utf8');
  expect(dashboard).toContain('setCurrency(data.defaultCurrency');
  expect(dashboard).not.toContain('salesDefaultCurrency');
});
