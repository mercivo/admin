# v1.0.15 rollout

## Preconditions

- [ ] Backend, Frontend, and Storefront tests and builds pass.
- [ ] Translation publication and metadata parity tests pass.
- [ ] `frontend/e2e/empty-placeholder.spec.ts` passes.
- [ ] `node scripts/validate-release.mjs v1.0.15` and `git diff --check` pass.

## Deployment

1. Merge the reviewed release to `main`.
2. Deploy only through `mercivo-main` and the root `cloudbuild.yaml` in `mercivo-admin` / `asia-east1`.
3. Confirm the migration Job completes without schema or data changes and all three services receive 100% traffic.
4. Publish a test site version containing localized identity, SEO metadata, and a favicon.

## Verification

- [ ] Home and product pages emit the expected localized title and description.
- [ ] Empty SEO fields fall back to localized site name and description.
- [ ] Server HTML and the hydrated page agree on metadata, social tags, JSON-LD, and favicon.
- [ ] Removing the favicon and publishing a new version removes the icon link.
- [ ] A historical version without the new fields still renders normally.
- [ ] The custom domain and shared site URL emit the same tenant metadata.
- [ ] `celuxent.vip`, its product page, `robots.txt`, and `sitemap.xml` remain healthy.

## Evidence

- Build ID: pending
- Commit SHA: pending
- API revision: pending
- Admin revision: pending
- Storefront revision: pending
- Multilingual metadata result: pending
- Browser tab icon result: pending
- Domain smoke result: pending
