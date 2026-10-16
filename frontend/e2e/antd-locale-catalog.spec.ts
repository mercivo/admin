import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { ANTD_LOCALE_OPTIONS } from '../src/config/antdLocales';

test('storefront language catalog exactly matches installed Ant Design locales', () => {
  const installed = readdirSync(join(process.cwd(), 'node_modules/antd/es/locale'))
    .filter(name => name.endsWith('.js'))
    .map(name => name.replace(/\.js$/, ''))
    .filter(name => !['context', 'index', 'useLocale'].includes(name))
    .sort();
  const configured = ANTD_LOCALE_OPTIONS.map(option => option.value).sort();

  expect(new Set(configured).size).toBe(configured.length);
  expect(configured).toEqual(installed);
  expect(ANTD_LOCALE_OPTIONS.find(option => option.value === 'en_US')).toMatchObject({ label: '英语', nativeLabel: 'English' });
  expect(ANTD_LOCALE_OPTIONS.find(option => option.value === 'zh_TW')).toMatchObject({ label: '繁体中文', nativeLabel: '繁體中文' });
});
