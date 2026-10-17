# v1.0.3 changelog

## Operational changes

- Replace additive Cloud SQL attachment with an exact attachment to `mercivo-mysql-v2`.
- Retire and delete the unreferenced 100 GB `mercivo-mysql` instance after deployment verification.
- Preserve the final on-demand backup, retained backups, and 30-day final backup as recovery evidence.

## Components

- [x] API deployment configuration
- [x] Database infrastructure
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Admin
- [ ] Storefront
