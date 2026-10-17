# v1.0.2 SQL plan

These files are read-only verification queries. They do not perform schema changes or historical-data corrections.

1. Run `001-preflight.sql` against `mercivo-mysql/seo_platform` before enabling maintenance mode.
2. Record aggregate size, table count, per-table row estimates, charset, timezone, and migration count in `ROLLOUT.md`.
3. Stop if total database size is 6 GiB or greater; recalculate the target disk as twice actual usage, rounded up, with a 10 GB minimum.
4. After logical import, run `002-verify-target.sql` against `mercivo-mysql-v2/seo_platform`.
5. Compare every result. Row estimates can differ after import; for business-critical tables, replace estimates with exact `COUNT(*)` checks in Cloud SQL Studio before cutover.

No SQL file in this release may be used to edit production data.
