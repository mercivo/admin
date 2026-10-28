import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './worker.mjs';

const env = { EDGE_PROXY_SHARED_SECRET: 'edge-secret', STOREFRONT_ORIGIN: 'https://site.aihubflux.com' };

test('proxies an external custom hostname with path, query and trusted original host', async () => {
  const previousFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async request => { captured = request; return new Response('ok'); };
  try {
    const response = await worker.fetch(new Request('https://shop.example.com/products/1?lang=zh_CN'), env);
    assert.equal(await response.text(), 'ok');
    assert.equal(captured.url, 'https://site.aihubflux.com/products/1?lang=zh_CN');
    assert.equal(captured.headers.get('x-mercivo-original-host'), 'shop.example.com');
    assert.equal(captured.headers.get('x-mercivo-edge-token'), 'edge-secret');
  } finally { globalThis.fetch = previousFetch; }
});

test('preserves method and request body', async () => {
  const previousFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async request => { captured = request; return new Response('ok'); };
  try {
    await worker.fetch(new Request('https://shop.example.com/api/lead', { method: 'POST', body: 'payload' }), env);
    assert.equal(captured.method, 'POST');
    assert.equal(await captured.text(), 'payload');
  } finally { globalThis.fetch = previousFetch; }
});

test('rejects platform hostnames so a broad route cannot loop', async () => {
  for (const hostname of ['aihubflux.com', 'erp.aihubflux.com', 'api.aihubflux.com', 'site.aihubflux.com', 'image.aihubflux.com', 'fallback.aihubflux.com', 'customers.aihubflux.com']) {
    const response = await worker.fetch(new Request(`https://${hostname}/`), env);
    assert.equal(response.status, 404);
  }
});

test('fails closed when secrets or origin are missing', async () => {
  const response = await worker.fetch(new Request('https://shop.example.com/'), {});
  assert.equal(response.status, 503);
});
