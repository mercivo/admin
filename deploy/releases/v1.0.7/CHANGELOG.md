# v1.0.7 changelog

## User-visible changes

- Reduced the absolute login lifetime from seven days to 24 hours.
- Redirect expired sessions to login with a clear re-authentication notice.
- Keep one API instance warm to prevent idle-to-active navigation timeouts.

## Components

- [x] API
- [x] Admin
- [ ] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
