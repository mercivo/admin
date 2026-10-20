# v1.0.6 rollout

## Preconditions

- [ ] Admin build and route-aware bundle budgets passed
- [ ] Admin Playwright smoke and empty-placeholder checks passed
- [ ] `node scripts/validate-release.mjs v1.0.6` passed
- [ ] Read-only production performance baseline saved

## Ordered actions

1. Merge the reviewed commit to `main`.
2. Let the `mercivo-main` Cloud Build trigger build, test, and deploy all services.
3. Do not deploy an individual service from a developer machine.
4. Do not run a migration reset, first-install procedure, or data-correction script.
5. Confirm Admin, API, and Storefront all have service- and revision-level maximum instance counts of 1 and minimum instance counts of 0.

## Verification

- Build ID and commit SHA: record during rollout
- Admin bundle budgets: login at most 200 KiB gzip; Dashboard initial increment at most 250 KiB gzip
- Static assets: confirm gzip plus `public, max-age=2592000, immutable`
- HTML: confirm `no-cache, no-store, must-revalidate`
- Business smoke: login and read Dashboard only; do not create or modify tenant data
- Performance: run `scripts/check-production-performance.sh` before and after rollout on the same network and compare client timing with Cloud Run latency
