# v1.0.1 rollout

## Preconditions

- [ ] Local gates passed
- [ ] Cloud preflight passed
- [ ] Backup/PITR checked
- [x] No data correction is included

## Ordered actions

1. Push the reviewed commit to `main` and let the `mercivo-main` Cloud Build trigger run the unified pipeline.
2. Confirm `mercivo-api` uses `GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/mercivo-images-753805870951`.
3. Upload a new product PNG and confirm the returned URL uses the GCS public base URL.
4. Open a product whose stored image URL starts with `https://image.aihubflux.com/` in Admin and Storefront and confirm it renders.
5. Verify one extra-wide image and one extra-tall image in Admin and Storefront; each image must be fully visible, centered, and uncropped.

## Verification

- Build ID: record after rollout
- Commit SHA: record after rollout
- Migration execution: must succeed with no new migration
- API revision: record after rollout
- Admin revision: record after rollout
- Storefront revision: record after rollout
- Business smoke result: pending rollout
