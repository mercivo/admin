-- Version: v1.0.11
-- Purpose: preserve the original effective hostname for historical custom-domain rows.
-- Scope: site_domains rows whose new requested_hostname column is null.
-- Idempotency: reruns affect no row after requested_hostname is populated.
-- Backup/restore: record a Cloud SQL PITR timestamp and export the matching rows before execution.
-- Verification before: SELECT COUNT(*) FROM site_domains WHERE requested_hostname IS NULL;
-- Verification after: SELECT COUNT(*) FROM site_domains WHERE requested_hostname IS NULL;

UPDATE site_domains
SET requested_hostname = hostname
WHERE requested_hostname IS NULL;
