# v1.0.4 multilingual content rollout

## Preconditions

- [ ] Translation cache and import regression tests pass.
- [ ] Full backend tests and build pass.
- [ ] Translation grouped-pagination Playwright tests and empty-placeholder scan pass.
- [ ] `node scripts/validate-release.mjs v1.0.4` passes.
- [ ] `mercivo-api` remains configured with `max-instances=1` and without `REDIS_HOST` or `REDIS_PORT`.

## Ordered actions

1. Push the reviewed commit to `main` and wait for the `mercivo-main` Cloud Build trigger to succeed.
2. Confirm the unified pipeline deploys API, Admin, and Storefront and applies `AddTranslationListPerformanceIndex1792485000000`.
3. Confirm the new API revision receives 100% traffic and still has `max-instances=1` with no Redis environment variables.
4. Upload the tenant's `hr_HR` workbook and verify the preview reports 79 rows, including five blank translations that will be skipped.
5. Commit the import, refresh multilingual content, and confirm the translated values are present.
6. Check API logs for the import request and confirm there are no Redis connection errors or unexpected HTTP 500 responses.
7. Open each multilingual content tab and verify that one list request is sent per tab or page change and that groups are not split between pages.
8. Verify identical Chinese variant copy appears as separate fields, edits independently, and exports as one Excel row per stable key.
9. Verify all three multilingual tabs keep the same card and field order after refresh, filtering, and pagination.
10. Verify Product Content quick navigation lists first-level categories, second-level categories, and product cards in that order.

## Verification

- Build ID: record after deployment
- Commit SHA: record after deployment
- Migration execution: record successful creation of `idx_translation_units_site_active_type_updated`
- API revision: record after deployment
- Admin revision: record after deployment
- Storefront revision: record after deployment
- Business smoke result: record preview/import totals, translated-content verification, grouped pagination, and list latency
