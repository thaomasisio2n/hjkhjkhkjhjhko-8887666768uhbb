#!/bin/sh
set -e

# Volumes created by older images belong to root; the API now runs as "node".
if ! touch /data/.write-test 2>/dev/null; then
  echo "Can't write to /data as uid $(id -u). If this volume was created by an older image, fix it with:"
  echo "  docker compose run --rm --user root api chown -R node:node /data"
  exit 1
fi
rm -f /data/.write-test

# No secret configured? Generate one per container start instead of falling
# back to the public default (existing sessions just need to sign in again).
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
  export JWT_SECRET
  echo "JWT_SECRET not set — generated a random one for this run."
fi

npx prisma migrate deploy
npx prisma db seed
exec node dist/index.js
