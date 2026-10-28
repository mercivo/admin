# v1.0.11 operator SQL

Run `001-backfill-requested-hostname.sql` only after the schema migration and after recording a Cloud SQL PITR timestamp plus an export of `site_domains`. The statement is limited to rows where `requested_hostname` is null and is safe to rerun.
