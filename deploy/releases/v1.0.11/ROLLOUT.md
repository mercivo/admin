# v1.0.11 rollout

## Preconditions

- [ ] Backend tests and all three service builds pass.
- [ ] `frontend/e2e/empty-placeholder.spec.ts` or the equivalent source scan passes.
- [ ] `node scripts/validate-release.mjs v1.0.11` passes.
- [ ] Record a Cloud SQL PITR timestamp and export `site_domains` before the operator SQL step.
- [ ] Confirm `customers.aihubflux.com` and the Cloudflare for SaaS fallback origin remain healthy.

## Ordered actions

1. Merge the reviewed commit to `main` and use only `mercivo-main` with the root `cloudbuild.yaml` in `mercivo-admin` / `asia-east1`.
2. Confirm the forward-only migration added nullable `requested_hostname` and changed only the default lifecycle state.
3. Run `sql/001-backfill-requested-hostname.sql` explicitly and record the operator, timestamp, backup reference, and affected-row count.
4. Add a disposable apex test domain in ERP and confirm the response binds `www.<domain>`.
5. Configure only the displayed CNAME to `customers.aihubflux.com`; confirm the row moves from `pending_dns` to `provisioning` and then `active` with valid HTTPS.
6. Confirm an explicit subdomain is not rewritten and a multi-level suffix such as `example.co.uk` is normalized correctly.

## Regression verification

- Existing `celuxent.vip` keeps its exact hostname, provider ID, DNS route, and valid HTTPS.
- An active domain for a draft site reports that HTTPS is ready while the site awaits publication.
- ERP, API, Storefront, image delivery, `robots.txt`, and `sitemap.xml` remain healthy.
- No API token or provider credential is present in API responses, logs, or release files.
