# Mercivo storefront edge Worker

This Worker is the Cloudflare for SaaS fallback edge. It forwards external Custom Hostnames to `https://site.aihubflux.com` and authenticates the original hostname with two Worker variables:

- secret: `EDGE_PROXY_SHARED_SECRET` (the same value as Google Secret Manager secret `mercivo-storefront-edge-secret`);
- plain text: `STOREFRONT_ORIGIN=https://site.aihubflux.com`.

Production routes are `*/*` to this Worker plus explicit no-Worker exclusions for `aihubflux.com/*`, `erp.aihubflux.com/*`, `api.aihubflux.com/*`, `site.aihubflux.com/*`, `image.aihubflux.com/*`, `fallback.aihubflux.com/*`, and `customers.aihubflux.com/*`. Test with `node --test worker.test.mjs` before publishing.
