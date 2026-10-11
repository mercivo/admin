import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(process.cwd(), 'src');
const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const path = resolve(directory, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(?:ts|tsx)$/.test(name) ? [path] : [];
});

test('all table operation columns use the shared action-column UI', () => {
  const files = sourceFiles(sourceRoot);
  const directAntColumns = files
    .filter(path => !path.endsWith('/components/shared/TableActions.tsx'))
    .filter(path => /title\s*:\s*['"]操作['"]/.test(readFileSync(path, 'utf8')));
  const unstyledManualHeaders = files.filter(path => {
    const source = readFileSync(path, 'utf8');
    return [...source.matchAll(/<th\b[^>]*>操作<\/th>/g)].some(match => !match[0].includes('app-table-action-column-manual'));
  });
  const hoverOnlyActions = files.filter(path => {
    const source = readFileSync(path, 'utf8');
    return /<TableActions\b[^>]*revealOnRowHover/.test(source)
      || /app-table-actions-reveal/.test(source);
  });

  expect(directAntColumns, 'Use createActionColumn() for Ant Design tables').toEqual([]);
  expect(unstyledManualHeaders, 'Use the shared manual action-column class').toEqual([]);
  expect(hoverOnlyActions, 'Table operation actions must be visible without row hover').toEqual([]);
});
