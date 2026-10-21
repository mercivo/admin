# v1.0.8 rollback

## Trigger

Rollback if order editing, inventory reservation, product selection, or order detail scrolling regresses after deployment.

## Application rollback

Use the documented whole-release Cloud Run revision rollback procedure in `deploy/cloudrun/OPERATIONS.md`; do not deploy an individual service from a developer machine.

## Database/data rollback

This release has no schema migration or historical-data correction. No database restore or data edit is required.

## Verification after rollback

Confirm all three services use the selected known-good revisions, then run read-only purchase, sales, and inventory smoke checks.
