# Google Cloud production deployment

Mercivo production uses one Git-driven Cloud Build pipeline. Start with:

1. [`../AI_DEPLOYMENT_RULES.md`](../AI_DEPLOYMENT_RULES.md) — mandatory AI/operator rules.
2. [`OPERATIONS.md`](OPERATIONS.md) — login, preflight, iteration deployment, SQL, verification and rollback.
3. [`../releases/README.md`](../releases/README.md) — version package convention.
4. [`DOMAIN_MAPPING.md`](DOMAIN_MAPPING.md) — platform and tenant domains.

## Current resource summary

| Resource | Value |
| --- | --- |
| Project / number | `mercivo-admin` / `753805870951` |
| Region | `asia-east1` |
| Trigger | `mercivo-main`, GitHub `mercivo/admin`, `^main$`, `/cloudbuild.yaml` |
| Images | `asia-east1-docker.pkg.dev/mercivo-admin/mercivo` |
| Services | `mercivo-api`, `mercivo-admin`, `mercivo-storefront` |
| Migration job | `mercivo-migrate` |
| SQL | `mercivo-mysql`, database `seo_platform` |
| Uploads | `mercivo-images-753805870951`, production prefix `production/` |
| Runtime account | `mercivo-runtime@mercivo-admin.iam.gserviceaccount.com` |

`cloudbuild.yaml` discovers the current API service URL and injects it into Admin and Storefront. Do not hard-code a revision URL or create separate per-service triggers.

## Resource bootstrap (new Google Cloud project only)

These commands are not part of a normal release:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com

gcloud artifacts repositories create mercivo \
  --repository-format=docker --location=asia-east1

gcloud iam service-accounts create mercivo-runtime \
  --display-name='Mercivo Cloud Run runtime'
```

Create Cloud SQL, the `seo_platform` database, the image bucket, and the three named Secret Manager secrets before the initial build. Grant the runtime account only Cloud SQL client, Secret accessor, and bucket-scoped object permissions. Grant the actual Cloud Build service account Cloud Run admin, Artifact Registry writer and permission to use the runtime service account.

Create exactly one trigger:

```bash
gcloud builds triggers create github \
  --name=mercivo-main --region=global \
  --repo-owner=mercivo --repo-name=admin --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml \
  --substitutions=_REGION=asia-east1,_CLOUD_SQL_INSTANCE=mercivo-admin:asia-east1:mercivo-mysql,_DB_USER=root,_DB_NAME=seo_platform,_STOREFRONT_CNAME_TARGET=site.aihubflux.com
```

Verify the build service account in Cloud Build settings rather than assuming its address. Never create or download a long-lived service-account key.
