-- Version: v1.0.10
-- Purpose: move previously TXT-verified, non-local custom domains into the Cloudflare provisioning queue.
-- Scope: site_domains rows that are active, verified, non-local, and have no provider hostname ID.
-- Idempotency: reruns affect no row after status changes from active to provisioning or a provider ID is recorded.
-- Backup/restore: record the Cloud SQL PITR timestamp and export matching rows before execution; restore only the exported status fields if rollback is approved.
-- Verification before: SELECT id, hostname, status, ssl_status FROM site_domains WHERE status = 'active' AND verified_at IS NOT NULL AND provider_hostname_id IS NULL AND hostname <> 'localhost' AND hostname NOT LIKE '%.localhost';
-- Verification after: SELECT id, hostname, status, ssl_status FROM site_domains WHERE status = 'provisioning' AND provider_hostname_id IS NULL AND hostname <> 'localhost' AND hostname NOT LIKE '%.localhost';

UPDATE site_domains
SET status = 'provisioning',
    ssl_status = 'pending',
    provider_error = NULL,
    provider_synced_at = NULL
WHERE status = 'active'
  AND verified_at IS NOT NULL
  AND provider_hostname_id IS NULL
  AND hostname <> 'localhost'
  AND hostname NOT LIKE '%.localhost';
