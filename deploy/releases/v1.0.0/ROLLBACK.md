# v1.0.0 rollback

## Trigger

Rollback an individual service if the first release has an application regression while the API/database contract remains compatible.

## Application rollback

Route the affected service to its previous ready Cloud Run revision, then fix forward in Git. Because v1.0.0 intentionally replaced historical data, old application revisions are not guaranteed to understand the new empty baseline.

## Database/data rollback

There is no business-data rollback for the approved initial reset. Do not restore pre-v1 historical data. Correct schema or bootstrap defects with a new forward migration/release.

## Verification after rollback

Verify the selected ready revision receives 100% traffic, Admin returns HTML, captcha returns HTTP 200, and Cloud Run logs contain no new startup/database errors.
