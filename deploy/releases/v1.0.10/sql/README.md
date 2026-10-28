# v1.0.10 SQL

`001-queue-legacy-custom-domains.sql` is an explicit, idempotent historical-state correction. Run it only after the v1.0.10 schema migration and after recording the backup/PITR reference required by `ROLLOUT.md`.
