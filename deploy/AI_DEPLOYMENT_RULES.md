# AI deployment rules

This file is the execution contract for an AI or human operator deploying Mercivo. The detailed commands and recovery paths are in [`cloudrun/OPERATIONS.md`](cloudrun/OPERATIONS.md).

## 1. Fixed production topology

| Component | Resource |
| --- | --- |
| Google Cloud project | `mercivo-admin` (`753805870951`) |
| Region | `asia-east1` |
| Source | GitHub `mercivo/admin`, branch `main` |
| Build trigger | `mercivo-main` using `/cloudbuild.yaml` |
| API | Cloud Run `mercivo-api`, max 1 instance |
| Admin | Cloud Run `mercivo-admin` |
| Storefront | Cloud Run `mercivo-storefront` |
| Database | Cloud SQL MySQL 8.4 `mercivo-mysql`, database `seo_platform` |
| Migration job | Cloud Run Job `mercivo-migrate` |
| Images | Artifact Registry `asia-east1/mercivo` |
| Runtime uploads | `gs://mercivo-images-753805870951`, prefix `production/` |
| Runtime identity | `mercivo-runtime@mercivo-admin.iam.gserviceaccount.com` |
| Redis | Not provisioned; single API instance uses memory |

## 2. Non-negotiable rules

1. Read `AGENTS.md`, this file, the target release package, and `cloudrun/OPERATIONS.md` before changing production.
2. Inspect `git status`, current branch, commits not on `origin/main`, the active gcloud account/project, the trigger list, and current Cloud Run revisions before acting.
3. Do not print secret payloads. Check only that required secret names and versions exist.
4. Do not run `gcloud sql databases delete`, bucket-wide deletion, `data:reset`, `DB_SCHEMA_BOOTSTRAP=true`, or `DB_SYNCHRONIZE=true` during an iteration release.
5. A release must be represented by one directory named `deploy/releases/vMAJOR.MINOR.PATCH`. Never edit an already deployed release package to smuggle in new work; create a new version.
6. Schema changes are TypeORM migrations. Data corrections are reviewed SQL scripts attached to the same release. Application code must remain compatible with the schema before and after the deployment whenever rollback may be needed.
7. SQL scripts must be scoped, idempotent, tenant-aware where applicable, and contain a verification query. Never use an unqualified `UPDATE` or `DELETE`. Destructive DDL requires a separately approved maintenance release.
8. The Git push is the deployment action. Do not also run `gcloud builds submit` for the same commit, and do not recreate per-service source triggers.
9. A green build is necessary but not sufficient. Verify migration execution, ready revisions, 100% traffic, Admin HTML, the Admin-to-API proxy, and relevant business smoke tests.
10. Stop rollout and follow the release rollback document if migration, health, authentication, proxying, or smoke checks fail. Never erase data to make a failed iteration deploy pass.

## 3. AI execution phases

An AI-driven release must report evidence for each phase:

1. **Classify**: first install, normal iteration, hotfix, or maintenance/data correction.
2. **Prepare**: validate the release package, code, tests, migrations, SQL, compatibility, and rollback plan.
3. **Authenticate**: use `gcloud auth login` only when necessary, set the exact project and region, and verify account access.
4. **Preflight**: confirm Cloud SQL is runnable, required secrets exist, the single trigger is enabled, and current services are healthy.
5. **Protect data**: record the latest automated backup/PITR state. For data corrections, create an on-demand backup and record its identifier in the release evidence before executing SQL.
6. **Publish**: commit and push to `main`. Observe the build created by `mercivo-main`; do not start a duplicate build.
7. **Verify**: run the checks in `cloudrun/OPERATIONS.md` and record build ID, commit SHA, revisions, migration execution, and smoke results.
8. **Close**: update release evidence. Do not put generated logs or screenshots in Git; link to Cloud Build/Logging instead.

## 4. Approval boundaries

The repository owner authorizes normal code push and normal automatic deployment. Separate explicit confirmation is still required before production data deletion, database replacement, bucket-wide deletion, IAM expansion, secret rotation, domain/DNS changes, or a rollback that discards writes.

## 5. Source of truth

- Current desired deployment: `cloudbuild.yaml`
- Operational procedure: `deploy/cloudrun/OPERATIONS.md`
- Environment inventory: `deploy/ENVIRONMENT.md`
- Per-version intent and evidence: `deploy/releases/<version>/`
- Database structure history: `backend/src/migrations/`
- Historical-data correction SQL: `deploy/releases/<version>/sql/`
