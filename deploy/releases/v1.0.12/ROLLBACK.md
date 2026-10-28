# v1.0.12 rollback

## Trigger

Rollback if the full pipeline fails, platform hosts regress, custom-domain traffic still cannot authenticate after both secret updates, or the new Storefront revision introduces request-routing errors.

## Application rollback

Keep the last known-good Cloud Run revisions available. If application behavior regresses, use the whole-release process in `deploy/cloudrun/OPERATIONS.md` and prefer a forward fix from `main`; do not deploy an individual service from a developer machine. If traffic must be moved urgently, record the prior and replacement revision names.

For a secret rollback, re-enable the previous Google Secret Manager version if it was disabled, deploy a reviewed release through `mercivo-main` so Storefront binds that version, and only then restore the matching Cloudflare Worker secret. Never print either value.

## Database/data rollback

No schema migration, SQL, tenant-data update, domain rebinding, or publication change is part of this release. Database restore is neither required nor permitted for this incident.

## Verification after rollback

- Confirm all three platform hosts are healthy.
- Confirm Storefront and Worker use matching secret versions without exposing their values.
- Confirm `celuxent.vip` either serves the published site or remains in the documented pre-release failure state while a forward fix is prepared.
