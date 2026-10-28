import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorefrontMetadata } from './metadata.mjs';

const data = {
  site: { name: '中文品牌', description: '中文描述', faviconUrl: 'https://cdn.example/favicon.png', defaultLanguage: 'zh_CN' },
  seo: { title: '', description: '', keywords: '箱包' }, products: [],
  i18n: { sourceLocale: 'zh_CN', messages: { zh_CN: { 'site:name': '中文品牌', 'site:description': '中文描述' }, en_US: { 'site:name': 'Celuxent', 'site:description': 'Global bags', 'seo:title': '', 'seo:description': '' } } },
};

test('home metadata falls back to localized site identity', () => {
  const result = resolveStorefrontMetadata({ data, locale: 'en_US', canonical: 'https://example.com/' });
  assert.deepEqual({ title: result.title, description: result.description, siteName: result.siteName, faviconUrl: result.faviconUrl }, { title: 'Celuxent', description: 'Global bags', siteName: 'Celuxent', faviconUrl: 'https://cdn.example/favicon.png' });
});

test('localized site identity wins over source-language SEO when target SEO is blank', () => {
  const localized = structuredClone(data);
  localized.seo.title = '中文 SEO'; localized.seo.description = '中文 SEO 描述';
  const result = resolveStorefrontMetadata({ data: localized, locale: 'en_US', canonical: 'https://example.com/?lang=en_US' });
  assert.equal(result.title, 'Celuxent');
  assert.equal(result.description, 'Global bags');
});

test('localized SEO wins and product title uses localized site name', () => {
  const localized = structuredClone(data);
  localized.i18n.messages.en_US['seo:title'] = 'Official bags'; localized.i18n.messages.en_US['seo:description'] = 'Source globally';
  localized.i18n.messages.en_US['product:p1:name'] = 'Travel Bag'; localized.i18n.messages.en_US['product:p1:description'] = 'Product copy';
  assert.equal(resolveStorefrontMetadata({ data: localized, locale: 'en_US', canonical: 'https://example.com/' }).title, 'Official bags');
  const product = resolveStorefrontMetadata({ data: localized, locale: 'en_US', product: { id: 'p1', nameZh: '旅行包' }, canonical: 'https://example.com/products/p1' });
  assert.deepEqual({ title: product.title, description: product.description, productName: product.productName }, { title: 'Travel Bag｜Celuxent', description: 'Product copy', productName: 'Travel Bag' });
});

test('historical snapshots without new fields stay compatible', () => {
  const historical = { site: { name: 'Legacy', defaultLanguage: 'zh_CN' }, seo: {}, products: [], i18n: { sourceLocale: 'zh_CN', messages: { zh_CN: {} } } };
  const result = resolveStorefrontMetadata({ data: historical, locale: 'zh_CN', canonical: 'https://example.com/' });
  assert.deepEqual({ title: result.title, description: result.description, faviconUrl: result.faviconUrl }, { title: 'Legacy', description: '', faviconUrl: '' });
});
