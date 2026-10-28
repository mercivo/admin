# v1.0.10 rollout

## Preconditions

- [ ] Backend tests, frontend build, and empty-placeholder scan passed.
- [ ] `node scripts/validate-release.mjs v1.0.10` passed.
- [x] Cloudflare for SaaS is enabled on the `aihubflux.com` zone.
- [ ] `fallback.aihubflux.com` is an originless proxied fallback record and is Active in Cloudflare for SaaS.
- [ ] `customers.aihubflux.com` is a proxied CNAME target for tenant DNS records.
- [ ] The versioned storefront edge Worker is published with a broad Custom Hostname route and explicit no-Worker exclusions for every platform hostname listed in `deploy/cloudflare/storefront-edge/README.md`.
- [ ] A least-privilege Custom Hostnames API token exists in Secret Manager as `mercivo-cloudflare-saas-api-token`; do not record its value here.
- [ ] One shared random value exists as Worker Secret `EDGE_PROXY_SHARED_SECRET` and Google Secret Manager secret `mercivo-storefront-edge-secret`; do not record its value here.
- [ ] `_CLOUDFLARE_SAAS_ZONE_ID=ffc98ad2c68d96287a6c999a3fc956ea` identifies the `aihubflux.com` zone.
- [ ] Record a Cloud SQL PITR timestamp and export the current `site_domains` rows before the operator SQL step.
- [ ] Export the existing `celuxent.vip` DNS records before changing them.

## Ordered actions

1. Create the two fallback/CNAME-target DNS records, publish the edge Worker and its exclusions, set the shared Worker secret, and mark `fallback.aihubflux.com` as the Cloudflare for SaaS fallback origin.
2. Validate the Worker with a disposable test Custom Hostname before changing production customer DNS.
3. Merge the reviewed commit to `main` and let the `mercivo-main` trigger deploy the migration and all three Cloud Run services in `mercivo-admin` / `asia-east1`.
4. Confirm the API revision has both Cloudflare variables and Storefront has the edge secret without printing either secret.
5. Run `sql/001-queue-legacy-custom-domains.sql` explicitly against production and record the operator, timestamp, backup reference, affected-row count, and verification result.
6. In ERP, use “重新检查” for `celuxent.vip`, add any displayed Cloudflare DCV record, and confirm a Custom Hostname appears in the `aihubflux.com` zone.
7. After the Custom Hostname exists, remove only the four Google Sites A records and four Google Sites AAAA records for the `celuxent.vip` apex. Add an apex CNAME to `customers.aihubflux.com`; preserve TXT, mail, image, and unrelated records.
8. Configure an HTTPS 301 redirect from `www.celuxent.vip` to `https://celuxent.vip` while preserving the path and query string.
9. Wait for hostname and certificate status to become active, then complete verification below.

## Verification

- `https://celuxent.vip` returns 200 and resolves the published 赛伦森特 site.
- `https://www.celuxent.vip/<path>?<query>` returns 301 to the same path and query on `https://celuxent.vip`.
- Product pages, language selection, customer login, `robots.txt`, and `sitemap.xml` work on the apex domain.
- `erp.aihubflux.com`, `api.aihubflux.com`, and `site.aihubflux.com` remain healthy.
- The `site_domains` row is active only when both Cloudflare hostname and TLS status are active.
