import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('global scrollbar style also covers Ant Design table scroll containers', () => {
  const indexCss = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
  const themeCss = readFileSync(resolve(process.cwd(), 'src/styles/theme.css'), 'utf8');

  expect(themeCss).toContain('--scrollbar-size:');
  expect(themeCss).toContain('--scrollbar-thumb:');
  expect(themeCss).toContain('--scrollbar-thumb-hover:');
  expect(indexCss).toContain('scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track) !important');
  expect(indexCss).toContain('::-webkit-scrollbar');
  expect(indexCss).toContain('.ant-table-wrapper .ant-table-content');
  expect(indexCss).toContain('.ant-table-wrapper .ant-table-body');
  expect(indexCss).toContain('.ant-table-wrapper .ant-table-sticky-scroll-bar');
});
