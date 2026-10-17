-- Version: v1.0.2
-- Purpose: Capture the same aggregate target state after logical import for source/target comparison.
-- Expected rows: Every aggregate, table name, row estimate, charset, timezone, and migration result must match 001-preflight.sql.
-- Idempotency: Fully idempotent; this file contains SELECT statements only.
-- Verification: Compare results with the recorded source aggregates and stop before cutover on any unexplained difference.
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
