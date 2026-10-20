#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-https://erp.aihubflux.com}"
project_id="${PERF_PROJECT_ID:-mercivo-admin}"
region="${PERF_REGION:-asia-east1}"
sample_dir="$(mktemp -d /tmp/mercivo-production-performance.XXXXXX)"
trap 'rm -rf "$sample_dir"' EXIT

measure() {
  local label="$1"
  local url="$2"
  local output="$3"
  curl --compressed --silent --show-error --max-time 60 \
    --output "$output" \
    --write-out "$label code=%{http_code} dns=%{time_namelookup}s tcp=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s bytes=%{size_download} speed=%{speed_download}B/s\n" \
    "$url"
}

printf 'Read-only production performance check: %s\n' "$base_url"
measure 'document-first' "$base_url/" "$sample_dir/index-first.html"
measure 'document-repeat' "$base_url/" "$sample_dir/index-repeat.html"

asset_path="$(sed -n 's/.*src="\([^"?]*\.js\)".*/\1/p' "$sample_dir/index-first.html" | head -n 1)"
if [[ -z "$asset_path" ]]; then
  printf 'No JavaScript entry asset found in index.html\n' >&2
  exit 1
fi

measure 'asset-first' "$base_url$asset_path" "$sample_dir/asset-first.js"
measure 'asset-repeat' "$base_url$asset_path" "$sample_dir/asset-repeat.js"

printf '\nStatic asset response headers (%s):\n' "$asset_path"
curl --compressed --silent --show-error --head --max-time 60 "$base_url$asset_path" \
  | tr -d '\r' \
  | grep -Ei '^(HTTP/|content-type:|content-encoding:|content-length:|cache-control:|expires:|etag:|age:|server:)'

printf '\nAPI proxy timing (401 is expected without credentials):\n'
measure 'api-auth-me' "$base_url/api/v1/auth/me" "$sample_dir/auth-me.json"

if command -v gcloud >/dev/null 2>&1 && gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | grep -q .; then
  printf '\nRecent Cloud Run server-side request latency (client/network time is not included):\n'
  gcloud logging read \
    'resource.type="cloud_run_revision" AND (resource.labels.service_name="mercivo-admin" OR resource.labels.service_name="mercivo-api") AND httpRequest.requestUrl:*' \
    --project "$project_id" \
    --freshness 10m \
    --limit 30 \
    --order desc \
    --format='table(timestamp,resource.labels.service_name,httpRequest.requestMethod,httpRequest.requestUrl,httpRequest.status,httpRequest.latency,httpRequest.responseSize)' \
    2>/dev/null || printf 'Cloud Logging query unavailable; HTTP measurements above are still valid.\n'

  printf '\nEffective scaling configuration:\n'
  for service in mercivo-admin mercivo-api mercivo-storefront; do
    gcloud run services describe "$service" \
      --project "$project_id" \
      --region "$region" \
      --format="value(metadata.name,metadata.annotations.'run.googleapis.com/maxScale',spec.template.metadata.annotations.'autoscaling.knative.dev/minScale',spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale')" \
      2>/dev/null || true
  done
fi
