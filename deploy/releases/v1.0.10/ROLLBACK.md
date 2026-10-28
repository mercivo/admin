# v1.0.10 rollback

## Trigger

Rollback if Custom Hostname provisioning breaks existing platform domains, domain deletion becomes inconsistent, or the API cannot start after the migration.

## Application rollback

Prefer a forward fix. If rollback is required, use the whole-release procedure in `deploy/cloudrun/OPERATIONS.md`; never deploy one service from a developer machine. Keep the additive database columns and existing Cloudflare Custom Hostnames.

## Database and DNS rollback

- Do not drop the additive columns or delete provider hostnames during application rollback. Disable the broad Worker route first if the edge layer causes regressions; the explicit platform exclusions must remain intact until the route is disabled.
- The operator SQL can be logically reversed for a specific row by restoring its exported pre-release status only after confirming its previous routing and certificate behavior.
- Restore the exported Google Sites apex records only if the explicit rollback decision is to return `celuxent.vip` to Google Sites; otherwise leave the SaaS CNAME intact.
- A Cloud SQL restore is not normally required. Use the recorded PITR point only if domain rows were changed outside the documented scope.

## Verification after rollback

Confirm all three services use the selected known-good revisions, the shared storefront still works, and the chosen `celuxent.vip` routing target matches the rollback decision.
