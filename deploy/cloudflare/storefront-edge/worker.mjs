const PLATFORM_ZONE = 'aihubflux.com';

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const originalHost = incoming.hostname.toLowerCase();
    if (originalHost === PLATFORM_ZONE || originalHost.endsWith(`.${PLATFORM_ZONE}`)) {
      return new Response('Platform hostname is not handled by the custom-domain edge worker', { status: 404 });
    }
    if (!env.EDGE_PROXY_SHARED_SECRET || !env.STOREFRONT_ORIGIN) {
      return new Response('Edge worker is not configured', { status: 503 });
    }

    const target = new URL(`${incoming.pathname}${incoming.search}`, env.STOREFRONT_ORIGIN);
    const upstream = new Request(target, request);
    upstream.headers.set('x-mercivo-original-host', originalHost);
    upstream.headers.set('x-mercivo-edge-token', env.EDGE_PROXY_SHARED_SECRET);
    upstream.headers.delete('cf-connecting-ip');
    return fetch(upstream);
  },
};
