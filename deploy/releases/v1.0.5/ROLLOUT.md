# v1.0.5 rollout

## Preconditions

- [ ] Local API tests and build passed
- [ ] Admin build, bundle budget, and selected Playwright gates passed
- [ ] `node scripts/validate-release.mjs v1.0.5` passed
- [ ] Cloud SQL automated backup/PITR status checked

## Ordered actions

1. Merge the reviewed commit to `main`.
2. Let the `mercivo-main` Cloud Build trigger build all services.
3. Let the migration job add the six backward-compatible indexes before service deployment.
4. Do not run any first-install, reset, or historical-data correction procedure.
5. Verify API, Admin, and Storefront revisions through the single pipeline.

## Verification

- Build ID: record during rollout
- Commit SHA: record during rollout
- Migration execution: confirm `AddTenantQueryPerformanceIndexes1792490000000`
- API revision: record during rollout
- Admin revision: record during rollout
- Storefront revision: record during rollout
- Business smoke result: run read-only route audit and compare Cloud Run latency percentiles
