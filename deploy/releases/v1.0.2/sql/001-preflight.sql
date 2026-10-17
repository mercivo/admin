-- Version: v1.0.2
-- Purpose: Capture source database size, table counts, row estimates, charset, timezone, and migration state before logical export.
-- Expected rows: read-only result sets only; database size must remain below 6 GiB for the approved 10 GB target.
-- Idempotency: Fully idempotent; this file contains SELECT statements only.
-- Verification: Save only aggregate counts and sizes in ROLLOUT.md; never save customer rows or credentials.
-- Rollback: Not applicable because this file performs no writes.

SELECT
  table_schema,
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_mib,
  ROUND(SUM(data_length) / 1024 / 1024, 2) AS data_mib,
  ROUND(SUM(index_length) / 1024 / 1024, 2) AS index_mib,
  COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'seo_platform'
GROUP BY table_schema;

SELECT
  table_name,
  table_rows,
  ROUND((data_length + index_length) / 1024 / 1024, 2) AS total_mib
FROM information_schema.tables
WHERE table_schema = 'seo_platform'
ORDER BY table_name;

SELECT
  schema_name,
  default_character_set_name,
  default_collation_name
FROM information_schema.schemata
WHERE schema_name = 'seo_platform';

SELECT @@GLOBAL.time_zone AS global_time_zone, @@SESSION.time_zone AS session_time_zone;

SELECT COUNT(*) AS migration_count, MAX(timestamp) AS latest_migration_timestamp
FROM seo_platform.migrations;
