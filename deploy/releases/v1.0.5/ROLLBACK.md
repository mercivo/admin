# v1.0.5 rollback

## Trigger

Rollback the application revision if error rate, page-load failures, or API latency regress materially after deployment.

## Application rollback

Use the documented Cloud Run revision rollback procedure in `deploy/cloudrun/OPERATIONS.md`; do not deploy an individual service from a developer machine.

## Database/data rollback

The added indexes are backward compatible and may remain during an application rollback. Do not drop them during an incident unless database operations identifies a demonstrated regression and approves the matching migration rollback.

## Verification after rollback

Confirm all three services are on the selected known-good revisions, migrations remain consistent, and the read-only critical-route smoke test passes.
