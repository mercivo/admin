# v1.0.12 changelog

## User-visible changes

- Restore custom-domain routing for `celuxent.vip` by synchronizing the authenticated Cloudflare Worker and Storefront edge secret.
- Add redacted diagnostics when Storefront rejects an original hostname because edge authentication failed.
- Add production smoke checks for the complete custom-domain path.

## Components

- [ ] API
- [ ] Admin
- [x] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage

Cloudflare Worker configuration changes are an explicit operator step. No tenant, site, domain, or publication records are changed.
