# v1.0.4 rollback

## Trigger

Rollback if multilingual Excel preview or commit regresses, independent translation fields are omitted or unexpectedly linked, grouped pagination omits or splits content, the API returns unexpected 500 responses, or the deployed API no longer preserves the required single-instance configuration.

## Application rollback

Route all application traffic back to the previous known-good revisions through the reviewed production process. Do not create Redis, change Cloud Run scaling, or deploy an individual service from a developer machine.

## Database/data rollback

No historical-data correction is included. The added translation-unit index is backward compatible and may remain in place during an application rollback; remove it only through a separately reviewed forward migration if operational evidence requires that change. Successfully imported translations are ordinary tenant writes and must not be deleted automatically during rollback.

## Verification after rollback

Confirm API health, `max-instances=1`, absence of Redis environment variables, login/captcha behavior, existing multilingual content, and legacy pagination behavior. Re-export a fresh workbook before retrying an import after rollback.
