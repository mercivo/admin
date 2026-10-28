# v1.0.14 changelog

## User-visible changes

- Replace visible storefront loading copy with a loading indicator in public and preview entry points.
- Prevent server-rendered SEO content from flashing before the storefront application is ready.
- Normalize mobile product category and badge-filter vertical spacing to 8 px.

## Operations

- Add `/api/v1/healthz` as the production API health endpoint while retaining `/healthz` for local compatibility.
- Do not change domain mappings, tenant data, published versions, or Cloudflare routing.

## Components

- [x] API
- [x] Admin
- [x] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
