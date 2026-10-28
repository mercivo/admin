# v1.0.13 rollout

## Preconditions

- [x] The active Cloud Run inventory contains three services and two Jobs.
- [x] Execution `mercivo-v1010-domain-data-fix-7p7j7` completed successfully at `2026-10-28T05:15:50Z` and affected exactly one row.
- [x] The v1.0.10 release evidence records the one-time Job outcome.
- [x] `site.aihubflux.com` is still the shared storefront entry and the Worker origin and must be retained.
- [x] `mercivo-images-753805870951` already deletes only `local/` objects after 30 days.
- [x] The US$70 monthly budget already has 50%, 80%, 100%, and forecasted 100% thresholds.
- [x] Local validation gates pass.
- [x] The Cloud Run revision names, image digests, traffic state, and one-time Job metadata were captured in the operator transcript before deletion.

## Ordered actions

1. Merge the reviewed release documentation and cleanup policy through `main`. No service deployment or database migration is required solely for this operations release.
2. Delete only the Job definition `mercivo-v1010-domain-data-fix` in `mercivo-admin` / `asia-east1`. Do not execute it and do not modify its completed execution records.
3. Confirm the Cloud Run inventory now contains `mercivo-api`, `mercivo-admin`, `mercivo-storefront`, and `mercivo-migrate` only.
4. Retain the current and previous successful full-pipeline revisions plus enough recent revisions to cover five production image versions per package. Delete older zero-traffic revisions only after their inventory has been exported.
5. Query every remaining revision image URL. If any URL contains `/cloud-run-source-deploy/`, stop and leave that repository cleanup policy in dry-run mode.
6. If and only if the reference count is zero, delete the `cloud-run-source-deploy` repository.
7. Apply `deploy/cost/mercivo-cleanup.json` to the `mercivo` repository with dry-run enabled first. Review the candidates, then enable it only when current and retained rollback images are excluded.
8. Run all verification checks and record the results below.

## Protected resources

- Keep all three domain mappings: `erp.aihubflux.com`, `api.aihubflux.com`, and `site.aihubflux.com`.
- Keep `mercivo-migrate`, `mercivo-mysql-v2`, its automated backups and 7-day PITR.
- Keep `mercivo-db-migration-753805870951`; its two v1.0.2 recovery exports total 21 KiB.
- Keep all `production/` objects in `mercivo-images-753805870951` without an age-based deletion rule.
- Keep API at min 1 and max 1 while verification state remains in process memory and Redis is absent.

## Verification

- [x] `node scripts/validate-release.mjs v1.0.13` passes.
- [x] `git diff --check` passes.
- [x] Three Cloud Run services are Ready and `mercivo-migrate` is present.
- [x] The one-time Job definition no longer exists.
- [x] `https://erp.aihubflux.com/` returns the Admin application.
- [x] `https://api.aihubflux.com/api/v1/public/site` reaches the API and returns the expected platform-host `SITE_NOT_FOUND_OR_UNPUBLISHED` response.
- [x] `https://site.aihubflux.com/16c4dd54-99b0-4494-9bd9-47b562ecec08` returns the published storefront.
- [x] `https://celuxent.vip/`, its public site API, product `dbb74213-18ab-482d-ba2d-3265167f4f7d`, `robots.txt`, and `sitemap.xml` return 200.
- [x] `https://www.celuxent.vip/<path>?<query>` returns 301 and preserves path and query on the apex domain.
- [x] A forged edge host header without the valid shared secret returns 404 and cannot select the Celuxent tenant.
- [x] Cloud SQL remains `db-custom-1-3840` with 10 GB SSD, automated backups, 7-day PITR, and deletion protection.

`/healthz` on the Google-managed platform and Cloud Run hostnames returns a Google Frontend 404 before reaching the containers, including for Admin. It is therefore not used as domain-mapping evidence in this release. Cloud Run Ready state plus an application-owned API route is the effective health check; changing the health endpoint is a separate application release.

## Release evidence

- Commit SHA: pending review and commit
- Job metadata export: captured in the operator transcript before deletion
- Deleted Job: `mercivo-v1010-domain-data-fix`
- Remaining Cloud Run resources: 3 Ready services and `mercivo-migrate`
- Deleted zero-traffic revisions: 223 total; 89 referenced the legacy repository and 134 exceeded the five-version production rollback window
- Remaining revisions: API 10 revisions covering 5 image digests; Admin 5; Storefront 5
- Legacy repository reference count: 0
- Legacy repository deletion: completed
- `mercivo` cleanup policy: reviewed in dry-run, then enabled with 30-day untagged deletion and five-version retention
- Domain and business smoke result: passed; `site.aihubflux.com` retained and serving the shared storefront
- Billing and database health review: US$41.22 month-to-date, US$50.11 forecast; Cloud SQL safeguards unchanged
