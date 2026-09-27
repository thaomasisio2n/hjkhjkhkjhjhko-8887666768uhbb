#!/bin/sh
set -e

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
