# v1.0.13 rollback

## Trigger

- A retained Cloud Run service or domain mapping is changed or becomes unhealthy.
- Artifact cleanup would remove an image required by an active or retained rollback revision.

## Application rollback

- No application revision change is required for this operations-only release.
- Stop cleanup immediately if any revision still references `cloud-run-source-deploy`.
- If the one-time Job definition is unexpectedly required for audit, reconstruct it only from the exported pre-delete metadata. Do not execute it.

## Database/data rollback

- No database or tenant-data operation is part of this release.
- Do not rerun `mercivo-v1010-domain-data-fix` and do not restore the database.

## Verification after rollback

- Confirm the three services are Ready and serving their configured traffic.
- Confirm `mercivo-migrate` still exists.
- Re-run the platform and custom-domain smoke checks from `ROLLOUT.md`.
