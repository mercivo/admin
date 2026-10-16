# Google Cloud Run deployment and operations manual

This manual is written so an AI operator can deploy without relying on chat history. Production is Google Cloud Run; Docker Compose is local development only.

## 1. Login and select the environment

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
gcloud auth login                         # only if no intended active account
gcloud config set project mercivo-admin
gcloud config set run/region asia-east1
gcloud projects describe mercivo-admin --format='value(projectNumber)'
```

Expected project number: `753805870951`. If browser login is required, stop at the Google login page and let the user complete account selection, password, MFA, or CAPTCHA. Never request or store those credentials.

## 2. Architecture and deployment order

```text
GitHub main push
  -> Cloud Build mercivo-main
     -> backend tests and build
     -> API image
     -> mercivo-migrate job (TypeORM migrations + system admin ensure)
     -> mercivo-api
     -> Storefront image -> mercivo-storefront
     -> Admin image -> mercivo-admin
     -> final API origin configuration

Browser -> erp.aihubflux.com -> Admin Nginx -> mercivo-api
Browser -> site.aihubflux.com -> Storefront Node -> mercivo-api
mercivo-api -> Cloud SQL Unix socket
mercivo-api -> Cloud Storage production/ objects
```

The pipeline is deliberately serial. A database migration must finish before new API traffic is served.

## 3. First installation (historical record, do not repeat)

Version `v1.0.0` was initialized on 2026-10-16:

- replaced the `seo_platform` database with a new UTF-8 database;
- ran the single `InitialSchema` TypeORM migration;
- created the system administrator without demo/business seed data;
- cleared historical objects from the dedicated image bucket;
- replaced three per-service triggers with the single `mercivo-main` trigger;
- deployed all three services successfully.

This section records the baseline only. Future releases must use the iteration process below and preserve production data.

## 4. Prepare every iteration release

Create the package before code is pushed:

```bash
cp -R deploy/releases/_template deploy/releases/v1.1.0
# replace every TEMPLATE value and complete all checklists
printf 'v1.1.0\n' > deploy/releases/CURRENT
make release-validate VERSION=v1.1.0
```

Required contents:

- `release.yaml`: version, type, date, owner, compatibility and migration flags;
- `CHANGELOG.md`: user-facing changes and affected components;
- `ROLLOUT.md`: ordered rollout and smoke checks;
- `ROLLBACK.md`: code, database, and data rollback decision;
- `sql/README.md`: SQL order, scope, idempotency, verification, and rollback notes;
- zero or more numbered SQL files, for example `sql/010-normalize-order-status.sql`.

### Database change policy

| Change | Required mechanism |
| --- | --- |
| Additive schema change | New TypeORM migration in `backend/src/migrations/` |
| Backfill compatible data | Idempotent SQL in the release package, normally after additive schema migration |
| Correct historical records | Scoped, idempotent SQL plus pre/post counts and verification query |
| Drop/rename column | Expand/contract over at least two releases |
| Large table rewrite | Maintenance window, backup, batching, query plan, lock-risk review |

SQL is not executed implicitly by `cloudbuild.yaml`. This is intentional: a named operator must review production counts, record a backup, execute the exact files in numeric order, and save only non-sensitive evidence in `ROLLOUT.md`. Schema migrations remain automatic through `mercivo-migrate`.

For Cloud SQL, prefer Cloud SQL Studio or an approved private connection. Do not put DB passwords on a command line or in shell history. Each script must start with comments identifying version, purpose, expected rows, idempotency and rollback, and must avoid broad unqualified writes.

### Historical-data correction execution

The release `ROLLOUT.md` must say whether each numbered script runs before or after the application build. The default is after an additive, backward-compatible schema migration and before final business smoke testing.

```bash
# Record backup ID and completion state in ROLLOUT.md.
gcloud sql backups create --instance=mercivo-mysql \
  --description='pre-v1.1.0-data-correction'
gcloud sql backups list --instance=mercivo-mysql --limit=3 \
  --format='table(id,status,startTime,endTime,description)'
```

Wait for backup status `SUCCESSFUL`. Open Cloud SQL Studio for `mercivo-mysql`, select `seo_platform`, authenticate without copying a password into the repository, then execute the release files in numeric order. For every file:

1. run its pre-query and compare the count with the documented expectation;
2. stop if the count or tenant scope differs;
3. execute the transaction once;
4. run its verification query;
5. record only counts, timestamps and result status in `ROLLOUT.md`, never customer rows or credentials.

If command-line execution is later automated, it must use a short-lived authenticated channel and the same numbered files. Long-lived database passwords, public database exposure, and piping Secret Manager payloads into logs are prohibited.

## 5. Local release gates

```bash
git status --short
git branch --show-current                   # must be main for direct production release
git fetch origin
git log --oneline origin/main..HEAD

cd backend && npm ci --legacy-peer-deps && npm test -- --runInBand && npm run build
cd ../frontend && npm ci --legacy-peer-deps && npm run build
cd ../storefront && npm ci && npm run build
cd ..

if rg -n '—|–|&mdash;|&#8212;|&ndash;|&#8211;' frontend/src; then
  echo 'Invalid empty-value dash found'; exit 1
fi
make release-validate
git diff --check
```

Run relevant E2E/business acceptance tests for the changed modules. Generated reports belong outside Git.

## 6. Cloud preflight

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
gcloud config get-value project
gcloud run services list --region=asia-east1 \
  --format='table(metadata.name,status.latestReadyRevisionName,status.url)'
gcloud run jobs list --region=asia-east1
gcloud sql instances describe mercivo-mysql --format='value(state)'
gcloud builds triggers list --region=global \
  --format='table(name,disabled,github.name,github.push.branch,filename)'
gcloud secrets list --filter='name~"mercivo-(db-password|jwt-secret|system-admin-password)"' \
  --format='value(name)'
```

Expected: SQL `RUNNABLE`; one enabled trigger named `mercivo-main` for `^main$` and `cloudbuild.yaml`; all three secrets present. Do not print secret values.

For releases containing data SQL, additionally verify automated backup/PITR status and create an on-demand backup. Record its ID and time in `ROLLOUT.md` before executing the scripts.

## 7. Publish and monitor

```bash
git add <reviewed-files>
git commit -m 'feat: describe release'
git push origin main

gcloud builds list --region=global \
  --filter='substitutions.TRIGGER_NAME=mercivo-main' \
  --sort-by='~createTime' --limit=3 \
  --format='table(id,status,createTime,logUrl)'

gcloud builds describe BUILD_ID --region=global \
  --format='yaml(status,createTime,startTime,finishTime,logUrl)'
```

Wait for the build triggered by the pushed commit. Success criteria are `SUCCESS`, a successful latest `mercivo-migrate` execution, and 100% traffic on ready revisions.

## 8. Post-deploy verification

```bash
gcloud run services list --region=asia-east1 \
  --format='table(metadata.name,status.latestReadyRevisionName,status.traffic[0].percent)'
gcloud run jobs executions list --job=mercivo-migrate --region=asia-east1 --limit=3

curl -fsS https://erp.aihubflux.com/ >/dev/null
curl -fsS https://erp.aihubflux.com/api/v1/auth/captcha >/dev/null
```

Then verify the changed business flow in the UI, inspect service errors in Cloud Logging, and confirm no unexpected SQL or storage changes. An empty first-version storefront can return 404 until a site is created and published; later releases must test a known published site.

## 9. Rollback

### Application-only failure

Route traffic back to the previous ready revision for the affected service, then fix forward in Git. Record both revision names. Do not delete the failed revision until the incident is closed.

```bash
gcloud run revisions list --service=SERVICE --region=asia-east1
gcloud run services update-traffic SERVICE --region=asia-east1 \
  --to-revisions=PREVIOUS_REVISION=100
```

### Migration or data failure

Stop the rollout. Do not automatically run `migration:revert`: it is safe only when the release rollback file proves compatibility and data preservation. Prefer a forward corrective migration. Restore from backup/PITR only after identifying the recovery timestamp and accepting loss of writes after that timestamp.

### Redis failure

If Redis is introduced and unavailable, do not increase API instances or silently fall back in a way that invalidates verification state. Restore the last known-good networking/config revision or keep API at one instance while repairing Redis.

## 10. Redis enablement process

Redis is not required at the current one-instance scale. To enable it in a future release:

1. Create Memorystore in `asia-east1` and a Serverless VPC Access connector.
2. Restrict network access; Redis must not be public.
3. Attach the connector to `mercivo-api` and set `REDIS_HOST`/`REDIS_PORT` as ordinary environment configuration.
4. Test CAPTCHA/session behavior through at least two API instances.
5. Only then raise `--max-instances` above 1 in `cloudbuild.yaml`.
6. Document cost, failure behavior, rollback and observability in that release package.

## 11. Routine operational checks

- Weekly: failed builds, Cloud Run error rate, Cloud SQL CPU/memory/connections/storage, backup/PITR health.
- Monthly: IAM/service accounts, Secret Manager versions, Artifact Registry retention, budget alerts and GCS growth.
- Every release: trigger uniqueness, migration result, revisions/traffic, login/captcha, changed business smoke tests.
