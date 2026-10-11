import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoots = [resolve(process.cwd(), 'src'), resolve(process.cwd(), '../storefront/src')];

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const path = resolve(directory, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(?:ts|tsx|js|jsx)$/.test(name) ? [path] : [];
});

test('empty-value rendering does not use an em dash', () => {
  const violations = sourceRoots.flatMap(sourceFiles).filter(path => readFileSync(path, 'utf8').includes('—'));
  expect(violations, 'Use the shared empty-value convention "-" instead of an em dash').toEqual([]);
});
