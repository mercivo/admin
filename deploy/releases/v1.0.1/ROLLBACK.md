# v1.0.1 rollback

## Trigger

Rollback if uploads fail, GCS public objects cannot be read, or Admin/Storefront image rendering regresses after the unified deployment.

## Application rollback

Route all three Cloud Run services back to the prior known-good revisions through the standard production procedure. Do not redeploy an individual service from a developer machine.

## Database/data rollback

No schema migration or data correction is included. No database restore is required. Images uploaded during this release remain valid GCS objects and must not be deleted during application rollback.

## Verification after rollback

Confirm the three prior revisions receive 100% traffic and the Admin, API captcha endpoint, and Storefront health checks pass.
