# v1.0.14 rollout

## Preconditions

- [ ] Backend tests and build pass.
- [ ] Frontend tests and build pass.
- [ ] Storefront tests and build pass.
- [ ] Mobile spacing, renderer parity, loading, and empty-placeholder checks pass.
- [ ] `node scripts/validate-release.mjs v1.0.14` and `git diff --check` pass.
- [ ] v1.0.13 cleanup evidence remains present and the production inventory is three services plus `mercivo-migrate`.

## Ordered actions

1. Merge the reviewed v1.0.13 and v1.0.14 changes to `main`.
2. Deploy only through `mercivo-main` and the root `cloudbuild.yaml` in `mercivo-admin` / `asia-east1`.
3. Confirm the migration Job succeeds without schema changes and all three new revisions are Ready with 100% traffic.
4. Run the health, loading, layout, domain, and SEO checks below.
5. If any check fails, roll back all three services together; do not modify tenant data, domain bindings, secrets, or the database.

## Verification

- [ ] `https://api.aihubflux.com/api/v1/healthz` returns `200`, `text/plain`, and `ok`.
- [ ] Root `/healthz` remains available in local/container tests but is not used as Google Domain Mapping evidence.
- [ ] The public and preview loading states display only a spinner and no visible loading sentence.
- [ ] A cold visit to `https://celuxent.vip/` never displays server SEO text or source-like content before React renders.
- [ ] Hidden server SEO content, metadata, canonical links, alternate links, and JSON-LD remain in the initial HTML.
- [ ] At a 390 px viewport, category-to-badges, badge row, and badges-to-grid spacing are each 8 px.
- [ ] `site.aihubflux.com/<tenantId>`, `celuxent.vip`, a published product, `robots.txt`, and `sitemap.xml` return 200.
- [ ] `www.celuxent.vip/<path>?<query>` still redirects to the apex while preserving path and query.
- [ ] Forged edge headers without the shared secret cannot select a tenant.

## Release evidence

- Build ID: pending
- Commit SHA: pending
- Migration execution: pending (no schema migration expected)
- API revision: pending
- Admin revision: pending
- Storefront revision: pending
- Health result: pending
- Cold-load result: pending
- Mobile spacing result: pending
- Domain and SEO smoke result: pending
