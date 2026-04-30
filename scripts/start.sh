#!/bin/sh
# Production startup for DO App Platform.
#
# DigitalOcean's managed Postgres 15+ revokes CREATE on the `public` schema
# for non-owner users. We work around this by pushing the Prisma schema into
# a dedicated `app` schema, which the connecting user is allowed to create.
set -eu

# Append/replace the schema query parameter on DATABASE_URL.
case "$DATABASE_URL" in
  *\?*) NEW_URL="${DATABASE_URL}&schema=app" ;;
  *)    NEW_URL="${DATABASE_URL}?schema=app" ;;
esac
export DATABASE_URL="$NEW_URL"

echo "[boot] applying schema via prisma db push..."
pnpm prisma db push --skip-generate --accept-data-loss

echo "[boot] starting Next.js..."
exec pnpm next start -H 0.0.0.0
