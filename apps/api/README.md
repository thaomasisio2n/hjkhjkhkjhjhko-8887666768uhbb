# API (demo)

Fastify + Prisma + SQLite. JWT auth, fake wallet/top-up, referrals, and a
placeholder game catalog. No real payments, no real game clients.

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed   # or: npx tsx prisma/seed.ts
npm run dev
```

Runs on `http://localhost:8787` by default. `npm test` runs the Vitest
integration suite against a throwaway `prisma/test.db`.

The seed also creates a demo login: `demo@novaspin.test` / `demo1234`
(pre-loaded with a $50,000 fake balance) so you don't have to register a
fresh account every time.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `PATCH /auth/me` (display name and/or avatar preset key, `null` resets
  the avatar), `POST /auth/password` (needs the current password)
- `GET /wallet` (balance, daily deposit limit, deposited in the last 24h),
  `GET /wallet/transactions`, `POST /wallet/topup` (credits instantly — no
  processor, no blockchain — unless it would exceed the deposit limit)
- `PUT /wallet/limits` — set (`depositLimitCents`, min 1000) or remove
  (`null`) the rolling-24h deposit limit
- `GET /referrals` — your code, link (built from `WEB_ORIGIN`), invited
  friends, earnings and the current bonus amounts
- `GET /referrals/lookup/:code` — public, case-insensitive: confirms a code
  and returns the referrer's display name (used by the register page)
- `GET /games`, `GET /games/:slug/launch` (returns a placeholder launch
  shape only)

Login, register, password change and referral lookups are rate-limited per
IP (see `RATE_LIMITS` in `src/config.ts`; `RATE_LIMIT_SCALE` multiplies
them, which the e2e suite uses).
