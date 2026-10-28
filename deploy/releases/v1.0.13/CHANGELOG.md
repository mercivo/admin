# v1.0.13 changelog

## User-visible changes

- No product behavior or public API changes.
- Keep `site.aihubflux.com` as the shared storefront entry and Cloudflare Worker origin.

## Operations

- Remove the completed one-time `mercivo-v1010-domain-data-fix` Job definition without rerunning it or changing data.
- Retain the three Cloud Run services and the release migration Job.
- Add a production Artifact Registry cleanup policy that retains five recent versions per package.
- Refresh the production cost baseline and document the resources that must remain.

## Components

- [ ] API
- [ ] Admin
- [ ] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
- [x] Production operations
