# v1.0.16 rollout

## Authorized production scope

- Project/region: `mercivo-admin` / `asia-east1`; database instance: `mercivo-mysql-v2`.
- Tenant expected from the historical release record: `16c4dd54-99b0-4494-9bd9-47b562ecec08`.
- Site expected from the historical release record: `3cdb92fc-5a76-4dc0-82f8-92e1486e03c8`.
- Hostnames allowed to change: `celuxent.vip` and `www.celuxent.vip` only. Stop if the authenticated ERP tenant or site differs.
- Preserve every other custom domain and every unrelated Cloudflare record, including MX, mail, image, account-verification and unrelated TXT records.
- Pre-release public baseline on 2026-11-10: all three Cloud Run services were Ready at 100% traffic; `celuxent.vip`, `/robots.txt`, and `/sitemap.xml` returned Cloudflare 522.

## Preconditions

- [ ] Backend tests and all three service builds pass.
- [ ] Storefront tests and `frontend/e2e/empty-placeholder.spec.ts` or its equivalent source scan pass.
- [ ] `node scripts/validate-release.mjs v1.0.16` and `git diff --check` pass.
- [ ] `mercivo-main` is the sole enabled `main` trigger and `mercivo-mysql-v2` is `RUNNABLE` with deletion protection and PITR enabled.
- [ ] Export a redacted snapshot of the target `site_domains` rows and the relevant Cloudflare DNS/redirect configuration before deleting anything.
- [ ] Confirm `customers.aihubflux.com`, the fallback origin, and the edge Worker are healthy.

## Deployment

1. Merge the reviewed release to `main` and deploy only through `mercivo-main` with the root `cloudbuild.yaml`.
2. Confirm the migration Job replaces the direct hostname unique index with `claimed_hostname` plus `IDX_site_domains_claimed_hostname`, adds `primary_requested`, and does not rewrite existing hostname values.
3. Confirm all three new Cloud Run revisions receive 100% traffic and Admin, API, and shared Storefront smoke checks pass.
4. Stop before any tenant or DNS mutation if the build, migration, service health, tenant ID, site ID, or protected-resource checks differ from this package.

## Protected rebind procedure

1. Create an on-demand backup of `mercivo-mysql-v2`, wait for `SUCCESSFUL`, and record its ID and start/end time below.
2. In ERP, record the exact IDs, hostname, status, provider state, and primary flag for only `celuxent.vip` and `www.celuxent.vip`; never record verification tokens.
3. Export only the relevant Cloudflare apex/www DNS records and redirect rules, including proxy mode. This export is the DNS rollback source.
4. Remove only the ERP bindings whose normalized hostname is exactly `celuxent.vip` or `www.celuxent.vip`. The product API must remove the matching Cloudflare Custom Hostname before the local row is deleted; do not use SQL.
5. Remove only the `www.celuxent.vip` DNS record and its HTTPS redirect rule. Preserve the apex route until the new ERP claim has produced its TXT verification record.
6. Add `celuxent.vip` in ERP and confirm it remains exactly `celuxent.vip`, is not rewritten to `www`, starts in `pending_verification`, and exposes only `_mercivo-verification.celuxent.vip` TXT.
7. Add the displayed tenant-specific TXT in Cloudflare, verify ownership in ERP, and confirm the state becomes `pending_dns` before any routing record is shown.
8. Replace only the apex routing record with a DNS-only CNAME to `customers.aihubflux.com`; Cloudflare apex flattening must remain enabled. Remove only superseded apex A/AAAA/CNAME records after the new Custom Hostname exists.
9. Wait for hostname and TLS status to become `active`. Then remove the temporary Mercivo TXT and retain the apex CNAME.

## Verification

- [ ] ERP displays exactly `celuxent.vip` as active and does not create `www.celuxent.vip`.
- [ ] `https://celuxent.vip/`, its public site API, a published product, customer login, `robots.txt`, and `sitemap.xml` work on the apex origin.
- [ ] Canonical metadata, robots, and sitemap use `https://celuxent.vip`.
- [ ] `www.celuxent.vip` does not resolve to or redirect into the Celuxent site.
- [ ] A forged edge hostname without the shared secret cannot select the tenant.
- [ ] Cloud Logging contains no new migration, certificate, Worker authentication, or routing errors.
- [ ] Cross-tenant claim protection is accepted through automated transaction/unique-index tests; do not create an adversarial production tenant claim.

## Evidence

- Commit SHA: pending
- Build ID/status: pending
- Migration execution: pending
- API revision: pending
- Admin revision: pending
- Storefront revision: pending
- Backup ID/status: pending
- Pre-change domain/DNS snapshot: pending operator transcript
- Apex-domain result: pending
- `www` non-routing result: pending
- Security/log result: pending
