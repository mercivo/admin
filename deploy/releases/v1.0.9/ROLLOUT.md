# v1.0.9 rollout

## Preconditions

- [ ] Backend tests passed
- [ ] Admin build and empty-placeholder scan passed
- [ ] `node scripts/validate-release.mjs v1.0.9` passed

## Ordered actions

1. Merge the reviewed commit to `main`.
2. Let the `mercivo-main` Cloud Build trigger run the forward-only TypeORM migration and deploy all services in `mercivo-admin` / `asia-east1`.
3. Do not deploy an individual service or run the migration from a developer machine against production.
4. Do not run a reset, first-install procedure, SQL script, or data correction.

## Verification

- Create purchase and sales orders with at least three deliberately non-alphabetical product lines and verify list details retain that exact order.
- Cancel eligible test orders, reopen them, and verify the editor retains the same line order.
- Save reopened orders and verify the selected order remains unchanged.
- Create a receipt and shipment and verify their product lines follow the source order.
- Confirm the `sort_order` columns exist using a read-only schema query.
