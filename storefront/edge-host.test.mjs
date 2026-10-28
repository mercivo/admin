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

test('reports rejection reasons without exposing either secret', () => {
  const events = [];
  const reject = event => events.push(event);
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com' }, 'expected-secret', reject), 'site.aihubflux.com');
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com', 'x-mercivo-edge-token': 'provided-secret' }, 'expected-secret', reject), 'site.aihubflux.com');
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'bad\nhost', 'x-mercivo-edge-token': 'provided-secret' }, 'expected-secret', reject), 'site.aihubflux.com');
  assert.deepEqual(events, [
    { requestHost: 'site.aihubflux.com', originalHost: 'shop.example.com', reason: 'missing_edge_token' },
    { requestHost: 'site.aihubflux.com', originalHost: 'shop.example.com', reason: 'edge_token_mismatch' },
    { requestHost: 'site.aihubflux.com', originalHost: '[invalid]', reason: 'invalid_original_host' },
  ]);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('expected-secret'), false);
  assert.equal(serialized.includes('provided-secret'), false);
});

test('reports a missing storefront secret without trusting the original host', () => {
  let event;
  assert.equal(effectiveRequestHost({ host: 'site.aihubflux.com', 'x-mercivo-original-host': 'shop.example.com', 'x-mercivo-edge-token': 'provided-secret' }, '', value => { event = value; }), 'site.aihubflux.com');
  assert.deepEqual(event, { requestHost: 'site.aihubflux.com', originalHost: 'shop.example.com', reason: 'missing_expected_secret' });
});
