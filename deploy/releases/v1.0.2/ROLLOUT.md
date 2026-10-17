# v1.0.2 Cloud SQL cost migration rollout

## Fixed identities and approved scope

- Project: `mercivo-admin` (`753805870951`)
- Region: `asia-east1`
- Source: `mercivo-mysql`
- Target: `mercivo-mysql-v2`
- Database: `seo_platform`
- Private migration bucket: `gs://mercivo-db-migration-753805870951`
- Maintenance window: 30–60 minutes
- Source deletion: explicitly excluded from this rollout

## Recorded preflight evidence

- [x] Local release validation, backend 188-test suite, backend build, diff check, and empty-placeholder scan passed.
- [x] One enabled `mercivo-main` trigger targets `main` and root `cloudbuild.yaml`; all three Cloud Run services are healthy at 100% traffic.
- [x] Source is MySQL 8.4 Enterprise, zonal, `db-custom-1-3840`, 100 GB SSD, `ENCRYPTED_ONLY`, deletion protected.
- [x] Latest automated backup on 2026-10-16 completed successfully.
- [x] Cloud Monitoring disk bytes used on 2026-10-17: 1,213,566,976 bytes (about 1.13 GiB), below the 6 GiB gate.
- [x] Observed daily CPU maximum: 16.43%; memory maximum: 38.22%; connection maximum: 13.
- [x] Approved target remains 1 vCPU, 3.75 GB memory, 10 GB SSD with automatic growth.
- [x] `mercivo-mysql-v2` created `RUNNABLE` with the approved target settings on 2026-10-17.
- [x] Private bucket `gs://mercivo-db-migration-753805870951` created with public access prevention and Cloud SQL service-agent object access.
- [x] Target `root` password synchronized from Secret Manager without printing or persisting the secret.
- [x] Target configuration and initial operations verified; initial automated backup is running after creation.
- [x] Import preflight exposed distinct per-instance Cloud SQL service accounts; the migration tool now grants bucket object access dynamically to both source and target accounts.
- [ ] Run `sql/001-preflight.sql` in Cloud SQL Studio and record aggregate results below.
- [ ] Confirm the latest on-demand backup is `SUCCESSFUL` and record its ID below.

Source SQL aggregates:

- Total MiB: pending operator execution
- Table count: pending operator execution
- Migration count/latest timestamp: pending operator execution
- Charset/collation/timezone: pending operator execution
- On-demand backup ID/time: `1792208001815`, `SUCCESSFUL`, 2026-10-17 03:33:21Z–03:35:03Z
- Cloud SQL Studio aggregate query: blocked because the imported built-in user host format is unsupported by Studio; no network scope was expanded. Cutover verification uses successful managed export/import, target metadata, migration job, and application smoke tests.

## Phase A: ship the dormant maintenance gate

1. Review this release package and the maintenance middleware tests.
2. Keep `_MAINTENANCE_READ_ONLY=false` and `_CLOUD_SQL_INSTANCE=mercivo-admin:asia-east1:mercivo-mysql`.
3. Set `deploy/releases/CURRENT` to `v1.0.2`, validate, commit, and push the reviewed commit to `main`.
4. Wait for the single `mercivo-main` build to succeed and verify normal writes still work.

This phase adds capability only. It must not create, import, cut over, or delete a database.

## Phase B: prepare isolated target

Run:

```bash
./scripts/cloud-sql-cost-migration.sh preflight
CONFIRM_PRODUCTION=mercivo-admin ./scripts/cloud-sql-cost-migration.sh prepare-target
gcloud sql users set-password root --instance=mercivo-mysql-v2 \
  --project=mercivo-admin --prompt-for-password
```

Enter the existing `mercivo-db-password` value interactively. Do not print, copy into a file, or place the password on a command line. Verify target settings with:

```bash
./scripts/cloud-sql-cost-migration.sh verify-target
```

Stop if the target is not exactly MySQL 8.4 Enterprise, zonal, 1 vCPU/3.75 GB, 10 GB SSD, `ENCRYPTED_ONLY`, public-IP enabled, auto-growth enabled, 7 retained backups, 7 days of transaction logs, deletion protection, and 30-day final backup retention.

## Phase C: enter read-only mode

1. Change only `_MAINTENANCE_READ_ONLY` in `cloudbuild.yaml` from `false` to `true`.
2. Commit and push to `main`; the unified pipeline must deploy all services.
3. Verify `GET /healthz` and read-only Admin/Storefront pages still work.
4. Verify a controlled POST receives HTTP 503 with code `MAINTENANCE_READ_ONLY`.
5. Record the freeze time. From this point until cutover or rollback, do not re-enable source writes.

Freeze timestamp/revision: pending maintenance window

## Phase D: backup, logical export, and import

1. Create and wait for an on-demand source backup:

```bash
gcloud sql backups create --instance=mercivo-mysql --project=mercivo-admin \
  --description='pre-v1.0.2-cost-migration'
gcloud sql backups list --instance=mercivo-mysql --project=mercivo-admin --limit=3 \
  --format='table(id,status,startTime,endTime,description)'
```

2. When the backup is `SUCCESSFUL`, start the logical export:

```bash
CONFIRM_PRODUCTION=mercivo-admin ./scripts/cloud-sql-cost-migration.sh export
gcloud sql operations list --instance=mercivo-mysql --project=mercivo-admin --limit=5
```

3. Wait for export status `DONE` with no error, then import:

```bash
CONFIRM_PRODUCTION=mercivo-admin ./scripts/cloud-sql-cost-migration.sh import
gcloud sql operations list --instance=mercivo-mysql-v2 --project=mercivo-admin --limit=5
```

4. Wait for import status `DONE`. Run `sql/002-verify-target.sql` in target Cloud SQL Studio.
5. Compare source and target schema count, exact counts for every business-critical table, migrations, charset, collation, and timezone. Stop on any unexplained difference.

Export operation/object: `6d9bbee2-eb8f-408d-9d6d-500700000025` / `gs://mercivo-db-migration-753805870951/v1.0.2/seo-platform-final.sql.gz` (`10,750` bytes)

Import operation: `9c4200e4-a49e-428e-b422-ccc700000025` (`DONE`, no error)

## Phase E: unified cutover

Only after Phase D passes:

1. Change `_CLOUD_SQL_INSTANCE` in `cloudbuild.yaml` to `mercivo-admin:asia-east1:mercivo-mysql-v2`.
2. Change `_MAINTENANCE_READ_ONLY` back to `false` in the same commit.
3. Validate `v1.0.2`, commit, and push to `main`; do not deploy a service independently.
4. Wait for `mercivo-main`, the migration job, and all three Cloud Run revisions to succeed.
5. Verify health, login, captcha, Admin reads and writes, product image URLs, Storefront reads, purchase/sales/inventory writes, error logs, and target database connections.
6. Keep `mercivo-mysql` running and deletion protected for the seven-day observation period.

## Seven-day acceptance gate

- [ ] No connection exhaustion, OOM, sustained CPU above 70%, or unexplained slow-query increase.
- [ ] Disk remains below 60%; automatic backups and PITR are healthy.
- [ ] Complete one target restore drill without touching the active target.
- [ ] Billing shows no unexpected SKU and reflects the 10 GB target storage rate.
- [ ] Source remains deletion protected until a separate retirement approval and release package.

## Evidence

- Preparation build ID: `1e80dfa6-583b-4021-bade-42125c03c550` (`SUCCESS`)
- Preparation commit SHA: `d90c31d`
- Preparation API/Admin/Storefront revisions: `mercivo-api-00053-4xs` / `mercivo-admin-00036-zcp` / `mercivo-storefront-00028-77d`
- Preparation migration job execution: `mercivo-migrate-nsqhx` (`Completed=True`)
- Maintenance build ID/commit: `f1f4f517-2321-42d5-94e4-957da973b9d5` (`SUCCESS`) / `e85d5b7`
- Source on-demand backup: `1792208001815` (`SUCCESSFUL`, 2026-10-17 03:33:21Z–03:35:03Z)
- First cutover attempt build/commit: `4ab8f3d0-62e1-4ca2-a349-a6a0939bb86c` (`SUCCESS`) / `41843c7`; post-build verification found the trigger-level `_CLOUD_SQL_INSTANCE` override still pointed to the source. The API never switched databases, so no target/source write split occurred.
- Source refreeze build/commit: `9636964b-7119-40c6-a0cc-cf7df7c96cfa` (`SUCCESS`) / `1909783`; verified source connection plus HTTP 503 maintenance response.
- Trigger `mercivo-main` override updated through the Cloud Build API to `mercivo-admin:asia-east1:mercivo-mysql-v2` and read back successfully.
- Corrected source backup: `1792209823552` (`SUCCESSFUL`, 2026-10-17 04:03:43Z–04:05:45Z).
- Corrected export/import: `4195cb66-8e33-4902-970b-436100000025` / `gs://mercivo-db-migration-753805870951/v1.0.2/seo-platform-final-2.sql.gz` (`10,749` bytes), then `1dc507b2-4271-46c0-87eb-f34100000025`; both `DONE` without errors.
- Business smoke result: pending
- Seven-day observation end: pending
