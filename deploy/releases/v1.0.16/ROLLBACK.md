# v1.0.16 rollback

## Before tenant or DNS mutation

If build, migration, or service checks fail, do not touch domain bindings or DNS. Roll all three services together to the previous successful revisions or fix forward through `main`. Keep the additive schema and never run the migration `down` method in production.

## After the protected rebind starts

- Do not delete or edit rows with SQL and do not restore the whole database for an ordinary domain failure.
- Keep a successfully verified `celuxent.vip` row and prefer fixing its Cloudflare Custom Hostname, edge route, or apex CNAME forward.
- If DNS must be reversed, restore only the exact apex/www records, proxy modes, and redirect rules from the pre-change Cloudflare export. Do not change MX, mail, image, account-verification, or unrelated TXT records.
- If the new binding must be removed, use the ERP product flow so the provider hostname is removed before the local row. Recreate the previous exact binding through ERP before restoring its DNS route.
- Do not restore `www` automatically; restore it only when the explicit rollback decision is to return to the captured pre-release behavior.

## Database restore threshold

The on-demand `mercivo-mysql-v2` backup is a last-resort recovery point. Restore/PITR is allowed only after proving unexpected database corruption, identifying the recovery timestamp, and accepting the loss of every production write after that point. A normal 522, certificate delay, DNS propagation delay, or failed Custom Hostname is not a database-restore trigger.

After rollback, verify the selected Cloud Run revisions, Admin/API/shared Storefront health, exact target-domain rows, restored DNS records, and the documented `celuxent.vip` outcome.
