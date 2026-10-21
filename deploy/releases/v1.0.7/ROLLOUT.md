# v1.0.7 rollout

## Preconditions

- [ ] API authentication tests and Admin build passed
- [ ] Admin session-expiry and empty-placeholder checks passed
- [ ] `node scripts/validate-release.mjs v1.0.7` passed

## Ordered actions

1. Merge the reviewed commit to `main`.
2. Let the `mercivo-main` Cloud Build trigger build, test, migrate, and deploy all services in `mercivo-admin` / `asia-east1`.
3. Do not deploy an individual service from a developer machine.
4. Do not run a reset, first-install procedure, SQL script, or data correction.

## Verification

- Confirm `mercivo-api` has minimum instances 1 and maximum instances 1; Admin and Storefront remain minimum 0 and maximum 1.
- Log in with a test account and verify the JWT `exp - iat` is 24 hours.
- Use a synthetic expired token to verify the login redirect and re-authentication notice.
- Leave the read-only Dashboard idle, navigate to another read-only menu, and confirm no client timeout.
- Review Admin/API 499, 503, and 504 request logs without changing tenant data.
