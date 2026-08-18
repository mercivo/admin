#!/bin/sh
set -eu
npm run migration:run:prod
node dist/seed.js
