#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="mercivo-admin"
REGION="asia-east1"
SOURCE_INSTANCE="mercivo-mysql"
TARGET_INSTANCE="mercivo-mysql-v2"
DATABASE_NAME="seo_platform"
PROJECT_NUMBER="753805870951"
MIGRATION_BUCKET="mercivo-db-migration-${PROJECT_NUMBER}"
EXPORT_OBJECT="v1.0.2/seo-platform-final.sql.gz"

usage() {
  echo "Usage: $0 preflight|prepare-target|export|import|verify-target"
}

require_production_confirmation() {
  if [[ "${CONFIRM_PRODUCTION:-}" != "${PROJECT_ID}" ]]; then
    echo "Refusing production mutation. Set CONFIRM_PRODUCTION=${PROJECT_ID} for this command." >&2
    exit 2
  fi
}

require_source_runnable() {
  local state
  state="$(gcloud sql instances describe "${SOURCE_INSTANCE}" --project="${PROJECT_ID}" --format='value(state)')"
  [[ "${state}" == "RUNNABLE" ]] || { echo "Source instance is ${state}, expected RUNNABLE." >&2; exit 3; }
}

preflight() {
  gcloud config get-value project
  gcloud sql instances describe "${SOURCE_INSTANCE}" --project="${PROJECT_ID}" \
    --format='yaml(name,state,region,databaseVersion,settings.tier,settings.dataDiskType,settings.dataDiskSizeGb,settings.availabilityType,settings.backupConfiguration,settings.ipConfiguration.sslMode,settings.deletionProtectionEnabled)'
  gcloud sql backups list --instance="${SOURCE_INSTANCE}" --project="${PROJECT_ID}" --limit=3 \
    --format='table(id,status,startTime,endTime,type,location)'
  gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" \
    --format='table(metadata.name,status.latestReadyRevisionName,status.traffic[0].percent)'
  gcloud builds triggers list --project="${PROJECT_ID}" --region=global \
    --format='table(name,disabled,github.name,github.push.branch,filename)'
}

prepare_target() {
  require_production_confirmation
  require_source_runnable

  if ! gcloud storage buckets describe "gs://${MIGRATION_BUCKET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud storage buckets create "gs://${MIGRATION_BUCKET}" --project="${PROJECT_ID}" \
      --location="${REGION}" --uniform-bucket-level-access --public-access-prevention
  fi
  gcloud storage buckets add-iam-policy-binding "gs://${MIGRATION_BUCKET}" \
    --member="serviceAccount:p${PROJECT_NUMBER}-a9wuop@gcp-sa-cloud-sql.iam.gserviceaccount.com" \
    --role='roles/storage.objectAdmin'

  if ! gcloud sql instances describe "${TARGET_INSTANCE}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud sql instances create "${TARGET_INSTANCE}" --project="${PROJECT_ID}" \
      --database-version=MYSQL_8_4 --edition=ENTERPRISE --tier=db-custom-1-3840 \
      --region="${REGION}" --availability-type=zonal --storage-type=SSD --storage-size=10 \
      --storage-auto-increase --assign-ip --ssl-mode=ENCRYPTED_ONLY \
      --database-flags=cloudsql_iam_authentication=on --backup-start-time=11:00 \
      --enable-bin-log --retained-backups-count=7 --retained-transaction-log-days=7 \
      --deletion-protection --retain-backups-on-delete --final-backup \
      --final-backup-retention-days=30
  fi

  if ! gcloud sql databases describe "${DATABASE_NAME}" --instance="${TARGET_INSTANCE}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud sql databases create "${DATABASE_NAME}" --instance="${TARGET_INSTANCE}" --project="${PROJECT_ID}" \
      --charset=utf8mb4 --collation=utf8mb4_0900_ai_ci
  fi

  gcloud sql instances describe "${TARGET_INSTANCE}" --project="${PROJECT_ID}" \
    --format='yaml(name,state,connectionName,region,databaseVersion,settings.tier,settings.dataDiskType,settings.dataDiskSizeGb,settings.availabilityType,settings.backupConfiguration,settings.ipConfiguration,settings.databaseFlags,settings.deletionProtectionEnabled,settings.finalBackupConfig)'
  echo "Target prepared. Set the root password interactively to the existing Secret Manager value before import; never place it on the command line."
}

export_database() {
  require_production_confirmation
  require_source_runnable
  if gcloud storage objects describe "gs://${MIGRATION_BUCKET}/${EXPORT_OBJECT}" >/dev/null 2>&1; then
    echo "Export object already exists; refusing to overwrite gs://${MIGRATION_BUCKET}/${EXPORT_OBJECT}." >&2
    exit 4
  fi
  gcloud sql export sql "${SOURCE_INSTANCE}" "gs://${MIGRATION_BUCKET}/${EXPORT_OBJECT}" \
    --project="${PROJECT_ID}" --database="${DATABASE_NAME}" --offload --async
  echo "Export started. Wait for the operation to finish successfully before running import."
}

import_database() {
  require_production_confirmation
  local target_state
  target_state="$(gcloud sql instances describe "${TARGET_INSTANCE}" --project="${PROJECT_ID}" --format='value(state)')"
  [[ "${target_state}" == "RUNNABLE" ]] || { echo "Target instance is ${target_state}, expected RUNNABLE." >&2; exit 5; }
  gcloud storage objects describe "gs://${MIGRATION_BUCKET}/${EXPORT_OBJECT}" >/dev/null
  gcloud sql import sql "${TARGET_INSTANCE}" "gs://${MIGRATION_BUCKET}/${EXPORT_OBJECT}" \
    --project="${PROJECT_ID}" --database="${DATABASE_NAME}" --async
  echo "Import started. Wait for SUCCESS, then execute sql/002-verify-target.sql in Cloud SQL Studio."
}

verify_target() {
  gcloud sql instances describe "${TARGET_INSTANCE}" --project="${PROJECT_ID}" \
    --format='yaml(name,state,connectionName,region,databaseVersion,settings.tier,settings.dataDiskType,settings.dataDiskSizeGb,settings.availabilityType,settings.backupConfiguration,settings.ipConfiguration.sslMode,settings.databaseFlags,settings.deletionProtectionEnabled,settings.finalBackupConfig)'
  gcloud sql operations list --instance="${TARGET_INSTANCE}" --project="${PROJECT_ID}" --limit=10 \
    --format='table(startTime,endTime,operationType,status,error.errors.code)'
}

case "${1:-}" in
  preflight) preflight ;;
  prepare-target) prepare_target ;;
  export) export_database ;;
  import) import_database ;;
  verify-target) verify_target ;;
  *) usage; exit 1 ;;
esac
