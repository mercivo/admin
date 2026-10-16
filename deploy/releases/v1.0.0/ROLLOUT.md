# v1.0.0 rollout

## Preconditions

- [x] Backend tests and all three production builds passed
- [x] Cloud project, resources, IAM, secrets and trigger inspected
- [x] Existing data explicitly approved for deletion as an initial release

## Ordered actions

1. Created Artifact Registry repository `asia-east1/mercivo`.
2. Replaced three per-service triggers with `mercivo-main`.
3. Recreated `seo_platform` as `utf8mb4` / `utf8mb4_0900_ai_ci`.
4. Pushed `main`; the unified build ran migrations and deployed all services.
5. Cleared all 33 historical objects from the dedicated runtime image bucket.

## Verification

- Build ID: `747d1def-8de9-4cc7-92b0-b416fd338c71` (`SUCCESS`)
- Commit SHA: `2700108`
- Migration execution: `mercivo-migrate-8nkdc`, succeeded
- API revision after final configuration: `mercivo-api-00043-46c`
- Admin revision: `mercivo-admin-00031-c6f`
- Storefront revision: `mercivo-storefront-00023-xdm`
- Admin HTML: HTTP 200
- Admin-to-API captcha: HTTP 200
- Database: initial schema applied; system administrator ensured; no demo/business seed data
- Storage: bucket contains no objects after reset
