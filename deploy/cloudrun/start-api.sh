#!/bin/sh
set -eu

if [ "${DB_SCHEMA_BOOTSTRAP:-false}" = "true" ]; then
  echo "Bootstrapping a fresh database schema"
  SYSTEM_ADMIN_BOOTSTRAP_ENABLED=false SEED_DATA_ENABLED=false node dist/seed.js
fi

npm run migration:run:prod
DB_SCHEMA_BOOTSTRAP=false node dist/seed.js
exec node dist/main.js
