import assert from 'node:assert/strict';
import test from 'node:test';
import { effectiveRequestHost } from './edge-host.mjs';

test('trusts the original hostname only with the matching edge secret', () => {
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com', 'x-mercivo-edge-token': 'secret' }, 'secret'), 'shop.example.com');
});

test('ignores spoofed, missing and malformed edge headers', () => {
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com', 'x-mercivo-edge-token': 'wrong' }, 'secret'), 'site.aihubflux.com');
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com' }, 'secret'), 'site.aihubflux.com');
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'bad host', 'x-mercivo-edge-token': 'secret' }, 'secret'), 'site.aihubflux.com');
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com', 'x-mercivo-edge-token': 'secret' }, ''), 'site.aihubflux.com');
});
