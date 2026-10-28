# v1.0.14 rollback

## Trigger

- `/api/v1/healthz` does not return 200 after the full deployment.
- Public or preview storefronts remain on the loading indicator, expose SEO source content, or regress product filtering/layout.

## Application rollback

- Roll back API, Admin, and Storefront together to the previous successful full-pipeline revisions.
- Keep all v1.0.13 infrastructure cleanup results, domain mappings, secrets, and database settings unchanged.

## Database/data rollback

- No schema migration or historical-data correction is included.
- Do not restore or modify the database.

## Verification after rollback

- Verify the previous API application route, Admin, shared storefront, and `celuxent.vip`.
- Confirm Cloud Run still has three services and `mercivo-migrate` only.
