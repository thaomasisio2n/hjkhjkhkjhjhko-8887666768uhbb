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
- `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup` (always
  succeeds instantly — no processor, no blockchain)
- `GET /referrals`
- `GET /games`, `GET /games/:slug/launch` (returns a placeholder launch
  shape only)
