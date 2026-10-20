# v1.0.4 changelog

## User-visible changes

- Fix multilingual Excel import preview when production Redis is intentionally not configured.
- Keep preview tokens in API process memory for 30 minutes at the current single-instance scale.
- Return the existing expired-preview validation response after a process restart instead of a Redis connection error.

## Components

- [x] API
- [ ] Admin
- [ ] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
