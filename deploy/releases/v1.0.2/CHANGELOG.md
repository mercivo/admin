# v1.0.2 changelog

## Operational changes

- Add an opt-in API read-only maintenance gate for a consistent logical database export.
- Prepare migration from `mercivo-mysql` (100 GB SSD) to `mercivo-mysql-v2` (10 GB SSD).
- Preserve MySQL 8.4 Enterprise, 1 vCPU, 3.75 GB memory, zonal availability, encrypted connections, backups, PITR, and deletion protection.
- Add read-only preflight and target verification SQL; no schema or historical data correction is included.

## Components

- [x] API
- [ ] Admin
- [ ] Storefront
- [x] Database infrastructure
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [x] Temporary private migration storage
