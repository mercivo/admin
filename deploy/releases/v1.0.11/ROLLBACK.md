# v1.0.11 rollback

## Trigger

Rollback if new domain normalization, DNS detection, or HTTP DCV prevents new bindings or causes a regression for existing active domains.

## Application rollback

Use the whole-release procedure in `deploy/cloudrun/OPERATIONS.md` through the production pipeline. Do not deploy an individual service from a developer machine. Existing active hostname and Cloudflare ID values are unchanged and must not be removed.

## Database rollback

Keep the additive nullable `requested_hostname` column and its backfilled values during an application rollback. The previous application ignores the column and still understands historical lifecycle states. A Cloud SQL restore is not normally required.

## Verification after rollback

Confirm the three services use one known-good release, existing custom domains remain active, and no new-domain row or Cloudflare Custom Hostname was deleted.
