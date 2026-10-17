# v1.0.3 old Cloud SQL retirement rollout

## Preconditions

- [x] `mercivo-mysql-v2` is `RUNNABLE`, 10 GB SSD, deletion protected, and has successful automated backup/PITR configuration.
- [x] API `DB_SOCKET_PATH` and migration job point to `mercivo-mysql-v2`.
- [x] Corrected source backup `1792209823552` is `SUCCESSFUL`.
- [x] Source has 30-day final backup and retained-backup-on-delete enabled.
- [ ] Unified deployment replaces the API Cloud SQL attachment list with only `mercivo-mysql-v2`.
- [ ] Post-deploy health and connection checks pass.

## Ordered actions

1. Push this reviewed release to `main` and wait for `mercivo-main` to succeed.
2. Verify the migration job and API revision use only `mercivo-admin:asia-east1:mercivo-mysql-v2`.
3. Verify API 100% traffic, maintenance disabled, Admin HTTP 200, captcha HTTP 200, and no new database connection errors.
4. Confirm backup `1792209823552` remains `SUCCESSFUL`.
5. Disable deletion protection on the exact source instance `mercivo-mysql`.
6. Delete only `mercivo-mysql`. Keep retained backups and the 30-day final backup.
7. Verify `mercivo-mysql` no longer exists, `mercivo-mysql-v2` remains `RUNNABLE`, and production health remains green.

## Evidence

- Build ID: pending
- Commit SHA: pending
- API/Admin/Storefront revisions: pending
- Deletion operation: pending
- Final smoke: pending
