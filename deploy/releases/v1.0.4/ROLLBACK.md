# v1.0.4 rollback

## Trigger

Rollback if multilingual Excel preview or commit regresses, the API returns unexpected 500 responses, or the deployed API no longer preserves the required single-instance configuration.

## Application rollback

Route traffic back to the previous known-good API revision through the reviewed production process. Do not create Redis, change Cloud Run scaling, or deploy an individual service from a developer machine.

## Database/data rollback

No schema or historical-data correction is included. Successfully imported translations are ordinary tenant writes and must not be deleted automatically during rollback.

## Verification after rollback

Confirm API health, `max-instances=1`, absence of Redis environment variables, login/captcha behavior, and existing multilingual content. Re-export a fresh workbook before retrying an import after rollback.
