# v1.0.12 rollout

## Preconditions

- [ ] Backend tests and all three service builds pass.
- [ ] Storefront edge-host and Worker tests pass.
- [ ] `frontend/e2e/empty-placeholder.spec.ts` or the equivalent source scan passes.
- [ ] `node scripts/validate-release.mjs v1.0.12` and `git diff --check` pass.
- [ ] Cloud preflight confirms `mercivo-main`, the three Cloud Run services, and Secret Manager are healthy.
- [ ] Confirm the active Cloudflare Worker route still reaches Storefront and `celuxent.vip` TLS is valid.

## Ordered actions

1. Generate a new high-entropy value without printing it or writing it to the repository. The stored bytes must not include a trailing CR or LF because Wrangler normalizes interactive secret input.
2. Add it as a new enabled version of `mercivo-storefront-edge-secret`; do not disable the previous version yet.
3. Merge the reviewed commit to `main` and deploy only through `mercivo-main` with the root `cloudbuild.yaml` in `mercivo-admin` / `asia-east1`.
4. Confirm the build succeeds and the new Storefront revision is ready, serves 100% of traffic, and references `mercivo-storefront-edge-secret:latest`.
5. Set the Cloudflare Worker secret `EDGE_PROXY_SHARED_SECRET` to the same value without exposing it in command output or shell history.
6. Run every verification below. If any custom-domain check fails, inspect the redacted `storefront_edge_host_rejected` logs and Worker route before taking further action. Do not alter tenant data or domain bindings.
7. After all checks pass, disable every superseded Secret Manager version and record only version numbers, timestamps, revision names, and results here.

## Verification

- [ ] `https://celuxent.vip/` returns 200 and renders the published Celuxent site.
- [ ] `https://celuxent.vip/api/v1/public/site` returns site `3cdb92fc-5a76-4dc0-82f8-92e1486e03c8` and a published version.
- [ ] A published product URL returns 200.
- [ ] `https://celuxent.vip/robots.txt` and `/sitemap.xml` return 200 with the custom-domain origin.
- [ ] `https://www.celuxent.vip/<path>?<query>` redirects to the same path and query on `https://celuxent.vip`.
- [ ] A direct request to Storefront with forged `x-mercivo-original-host` and no valid edge token cannot select the Celuxent tenant.
- [ ] `erp.aihubflux.com`, `api.aihubflux.com`, and `site.aihubflux.com` remain healthy.
- [ ] Cloud Logging contains no post-rotation rejection for `celuxent.vip` and no edge secret values.

## Release evidence

- Build ID: pending
- Commit SHA: pending
- Migration execution: pending (no schema migration expected)
- API revision: pending
- Admin revision: pending
- Storefront revision: pending
- Google secret version: pending
- Previous Google secret version disabled: pending
- Cloudflare Worker secret updated: pending
- Business smoke result: pending
