# v1.0.4 multilingual Excel import rollout

## Preconditions

- [ ] Translation cache and import regression tests pass.
- [ ] Full backend tests and build pass.
- [ ] `node scripts/validate-release.mjs v1.0.4` passes.
- [ ] `mercivo-api` remains configured with `max-instances=1` and without `REDIS_HOST` or `REDIS_PORT`.

## Ordered actions

1. Push the reviewed commit to `main` and wait for the `mercivo-main` Cloud Build trigger to succeed.
2. Confirm the unified pipeline deploys API, Admin, and Storefront and completes its migration job without schema changes.
3. Confirm the new API revision receives 100% traffic and still has `max-instances=1` with no Redis environment variables.
4. Upload the tenant's `hr_HR` workbook and verify the preview reports 79 rows, including five blank translations that will be skipped.
5. Commit the import, refresh multilingual content, and confirm the translated values are present.
6. Check API logs for the import request and confirm there are no Redis connection errors or unexpected HTTP 500 responses.

## Verification

- Build ID: record after deployment
- Commit SHA: record after deployment
- Migration execution: succeeds with no schema migration
- API revision: record after deployment
- Admin revision: record after deployment
- Storefront revision: record after deployment
- Business smoke result: record preview, import totals, and translated-content verification
