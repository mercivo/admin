# v1.0.6 changelog

## User-visible changes

- Reduced the login first-load JavaScript dependency closure to no more than 200 KiB gzip.
- Removed authenticated layouts and product-gallery code from unauthenticated and Dashboard initial loading.
- Deferred Dashboard chart rendering until browser idle time so core business data becomes interactive first.
- Added route-aware bundle budgets and a read-only production network/server timing check.
- Locked both service-level and revision-level Cloud Run scaling to zero minimum and one maximum instance.

## Components

- [ ] API
- [x] Admin
- [ ] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
