# v1.0.9 rollback

## Trigger

Rollback if order creation, order editing, receipt, shipment, or product-line ordering regresses after deployment.

## Application rollback

Prefer a forward application fix. The additive `sort_order` columns are required by v1.0.9 code and harmless to older revisions, but application rollback must still use the documented whole-release procedure in `deploy/cloudrun/OPERATIONS.md`.

## Database/data rollback

Do not drop the additive columns during an application rollback. No historical data is rewritten and no database restore is required.

## Verification after rollback

Confirm all three services use the selected known-good revisions, then run read-only purchase, sales, and inventory smoke checks.
