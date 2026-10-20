# v1.0.5 changelog

## User-visible changes

- Reduced initial Admin JavaScript and removed an unnecessary product-gallery preload.
- Removed fixed delays from initial list loads while retaining search debouncing.
- Reused stable session, workspace, configuration, and warehouse-option reads within a browser session.
- Reduced dashboard database scans and added query-supporting indexes.
- Added privacy-safe API duration logs and read-only production performance coverage.

## Components

- [x] API
- [x] Admin
- [ ] Storefront
- [x] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
