# v1.0.2 rollback

## Triggers

Rollback before write traffic reaches the target if export/import fails, aggregate verification differs, target configuration is wrong, the unified build fails, health/authentication fails, or application latency is unacceptable.

After target writes begin, do not blindly route to the source: doing so would discard writes made on the target. Stop writes first, identify the authoritative database and recovery timestamp, and obtain explicit operator approval for any reverse migration or PITR.

## Before cutover

1. Keep `_CLOUD_SQL_INSTANCE=mercivo-admin:asia-east1:mercivo-mysql`.
2. Change `_MAINTENANCE_READ_ONLY=false` through a reviewed `main` commit and the `mercivo-main` pipeline.
3. Confirm source health and restore normal reads/writes.
4. Leave the incomplete target and private export untouched for investigation; both remain recoverable and deletion protected where applicable.

## During the cutover build, before target writes

1. If the unified build fails before the target API revision serves traffic, source remains authoritative.
2. Revert the cutover commit in Git, keeping the source connection and maintenance mode until the rollback build is ready.
3. Deploy only through `mercivo-main`, then disable maintenance in a reviewed follow-up commit if necessary.

## After target writes begin

1. Enable read-only maintenance through the unified pipeline.
2. Record the first target write time, last known source-consistent time, target backup/PITR status, and affected business operations.
3. Prefer fixing forward on `mercivo-mysql-v2`.
4. If reverse migration is required, create a new target backup and logical export, validate it, and import into a separately prepared recovery instance. Never overwrite or delete `mercivo-mysql` as part of an emergency rollback.

## Data protection

- Do not delete either Cloud SQL instance, the migration object, backups, or customer data in this release.
- The source remains deletion protected for at least seven successful observation days.
- Retirement requires a separate reviewed release naming the backup ID, restore test, verification queries, rollback decision, and exact deletion target.

## Verification after rollback

Confirm source connection name, successful migration job, all three ready revisions, health and captcha endpoints, login, one controlled write, storefront read, and absence of new Cloud SQL errors.
