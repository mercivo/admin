#!/bin/sh
set -eu

shutdown() {
  trap - TERM INT EXIT
  kill "${api_pid:-}" "${storefront_pid:-}" "${gateway_pid:-}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap shutdown TERM INT EXIT

PORT=3000 /app/start-api.sh &
api_pid=$!
PORT=8081 API_INTERNAL_URL=http://127.0.0.1:3000 node /app/storefront/server.mjs &
storefront_pid=$!
nginx -g 'daemon off;' &
gateway_pid=$!

while kill -0 "$api_pid" 2>/dev/null \
  && kill -0 "$storefront_pid" 2>/dev/null \
  && kill -0 "$gateway_pid" 2>/dev/null; do
  sleep 1
done

exit 1
