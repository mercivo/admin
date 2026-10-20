# v1.0.6 rollback

## Trigger

Rollback if login, navigation, deferred Dashboard charts, or static asset delivery regress after deployment.

## Application rollback

Use the documented whole-release Cloud Run revision rollback procedure in `deploy/cloudrun/OPERATIONS.md`; do not deploy an individual service from a developer machine.

## Database/data rollback

This release has no schema migration or historical-data correction. No database restore or data edit is required.

## Verification after rollback

Confirm all three services use the selected known-good revisions and run the read-only login and Dashboard smoke checks.
