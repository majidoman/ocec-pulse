#!/bin/sh
# Apply database migrations (waiting for the database to accept connections), then start the server.
set -eu
: "${DATABASE_URL:?DATABASE_URL is not set}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is not set}"
: "${BETTER_AUTH_URL:?BETTER_AUTH_URL (the public address) is not set}"

tries=0
until node scripts/migrate.mjs; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[pulse] database migrations failed after 30 attempts — stopping." >&2
    exit 1
  fi
  echo "[pulse] database not ready yet (attempt $tries/30), retrying in 3s…"
  sleep 3
done

echo "[pulse] starting on port ${PORT:-3000} — public address ${BETTER_AUTH_URL}"
exec node .output/server/index.mjs
