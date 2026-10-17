# v1.0.3 rollback

## Trigger

Stop before deletion if the unified build fails, any runtime attachment still references `mercivo-mysql`, target health fails, or database connection errors appear.

## Before source deletion

The source remains intact and deletion protected. Revert the deployment configuration through `main` only if the exact target attachment causes a regression.

## After source deletion

Do not recreate an empty instance under the old name. Prefer fixing forward on `mercivo-mysql-v2`. If target data is proven corrupt, use retained backup `1792209823552`, the 30-day final backup, or PITR to create a separate recovery instance, validate it, and perform a new reviewed cutover.

## Verification after rollback

Confirm the authoritative instance, API connection name, migration job, all service revisions, health, captcha, login, and one authenticated business write before closing the incident.
