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

Runs on `http://localhost:8787` by default.

The seed also creates a demo login: `demo@novaspin.test` / `demo1234`
(pre-loaded with a $50,000 fake balance) so you don't have to register a
fresh account every time.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `PATCH /auth/me` (change display name), `POST /auth/password` (needs the
  current password)
- `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup` (always
  succeeds instantly — no processor, no blockchain)
- `GET /referrals` — your code, link (built from `WEB_ORIGIN`), invited
  friends, earnings and the current bonus amounts
- `GET /referrals/lookup/:code` — public, case-insensitive: confirms a code
  and returns the referrer's display name (used by the register page)
- `GET /games`, `GET /games/:slug/launch` (returns a placeholder launch
  shape only)
