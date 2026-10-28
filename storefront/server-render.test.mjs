import assert from 'node:assert/strict';
import test from 'node:test';
import { renderInitialDocument } from './server-render.mjs';

const template = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';

test('server document shows a text-free loader while retaining hidden SEO content', () => {
  const html = renderInitialDocument(template, '<title>Celuxent</title>', '<main data-server-seo><h1>Celuxent</h1></main>');
  assert.match(html, /data-server-loading/);
  assert.match(html, /data-server-loader/);
  assert.match(html, /\[data-server-seo\]\{display:none!important\}/);
  assert.match(html, /<main data-server-seo><h1>Celuxent<\/h1><\/main>/);
  assert.doesNotMatch(html, />\s*(?:Loading site|Loading|正在加载站点)\s*</);
});

test('server document still renders the loader when site data is unavailable', () => {
  const html = renderInitialDocument(template);
  assert.match(html, /data-server-loading/);
  assert.doesNotMatch(html, /<[^>]+data-server-seo/);
});

test('tenant metadata replaces template defaults instead of creating duplicates', () => {
  const html = renderInitialDocument('<html><head><title>Default</title><meta name="description" content="Default"><meta name="robots" content="index"><link rel="icon" href="/default.ico"></head><body><div id="root"></div></body></html>', '<title>Tenant</title><meta name="description" content="Tenant"><meta name="robots" content="noindex"><link rel="icon" href="https://cdn.example/icon.png">');
  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.equal((html.match(/name="robots"/g) || []).length, 1);
  assert.equal((html.match(/rel="icon"/g) || []).length, 1);
  assert.match(html, /<title>Tenant<\/title>/);
});
