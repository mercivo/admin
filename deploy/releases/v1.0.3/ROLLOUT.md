# v1.0.3 old Cloud SQL retirement rollout

## Preconditions

- [x] `mercivo-mysql-v2` is `RUNNABLE`, 10 GB SSD, deletion protected, and has successful automated backup/PITR configuration.
- [x] API `DB_SOCKET_PATH` and migration job point to `mercivo-mysql-v2`.
- [x] Corrected source backup `1792209823552` is `SUCCESSFUL`.
- [x] Source has 30-day final backup and retained-backup-on-delete enabled.
- [x] Unified deployment replaces the API Cloud SQL attachment list with only `mercivo-mysql-v2`.
- [x] Post-deploy health and connection checks pass.

## Ordered actions

1. Push this reviewed release to `main` and wait for `mercivo-main` to succeed.
2. Verify the migration job and API revision use only `mercivo-admin:asia-east1:mercivo-mysql-v2`.
3. Verify API 100% traffic, maintenance disabled, Admin HTTP 200, captcha HTTP 200, and no new database connection errors.
4. Confirm backup `1792209823552` remains `SUCCESSFUL`.
5. Disable deletion protection on the exact source instance `mercivo-mysql`.
6. Delete only `mercivo-mysql`. Keep retained backups and the 30-day final backup.
7. Verify `mercivo-mysql` no longer exists, `mercivo-mysql-v2` remains `RUNNABLE`, and production health remains green.

## Evidence

- Build ID: `9917c1c0-a1f1-450d-9786-a1e946ebdb43` (`SUCCESS`).
- Commit SHA: `41fede6de2d7aab1021d05d6699c14dc63c7e804`.
- API/Admin/Storefront revisions: `mercivo-api-00065-m7v`, `mercivo-admin-00042-z8q`, `mercivo-storefront-00034-8pc`; each receives 100% traffic.
- Deletion operation: completed at 2026-10-17T11:50Z; `mercivo-mysql` was deleted after disabling deletion protection. Source backup `1792209823552` was `SUCCESSFUL`; retained backups and the configured 30-day final backup were preserved.
- Final smoke: the project instance list contains only deletion-protected `mercivo-mysql-v2` (`RUNNABLE`, 10 GB); the API attachment and `DB_SOCKET_PATH` reference only that instance; captcha returned HTTP 200, invalid login returned validation HTTP 400, and the deployed API revision had no severity `ERROR` logs.
