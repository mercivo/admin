# Project implementation rules

## Empty-value rendering

- Render a missing scalar field with the ASCII hyphen `-`.
- Never use an em dash `—`, en dash `–`, or an HTML dash entity as an empty-value placeholder.
- Reserve collection-level copy such as `暂无数据` for an empty table, list, or selector; do not use it for an individual missing field.
- Reuse the existing shared table and empty-state components where available.
- Before finishing frontend work, run `frontend/e2e/empty-placeholder.spec.ts` or an equivalent source scan to ensure no em dash was introduced.

## Production deployment

- The only production deployment path is Google Cloud project `mercivo-admin`, region `asia-east1`, through the `mercivo-main` Cloud Build trigger and the root `cloudbuild.yaml`.
- Never deploy the API, Admin, or Storefront independently from a developer machine. Push a reviewed commit to `main`; the single pipeline owns tests, schema migrations, image publication, and all three Cloud Run services.
- Never use `DB_SYNCHRONIZE=true` in production. Structural database changes must be forward-only TypeORM migrations. Historical-data corrections must be versioned, idempotent SQL files in the matching `deploy/releases/<version>/sql/` directory and require an explicit operator step documented by that release.
- Never edit or delete production data unless the release package names the exact script, scope, backup/restore point, verification query, and rollback decision. A normal iteration deploy is non-destructive.
- Secrets belong in Secret Manager. Do not commit credentials, paste secret values into release files, or create service-account JSON keys.
- Redis is currently intentionally omitted: API verification state is in process memory and `mercivo-api` must stay at `max-instances=1`. Enabling horizontal scaling requires Memorystore, a VPC connector, and `REDIS_HOST`/`REDIS_PORT` in the same release.
- Every production release must have a package under `deploy/releases/`, pass `node scripts/validate-release.mjs <version>`, and follow `deploy/cloudrun/OPERATIONS.md`.
- Do not run a first-install/reset procedure for an iteration release. The one-time v1 reset is recorded in `deploy/releases/v1.0.0/` and must not be repeated.
