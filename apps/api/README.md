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

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup` (always
  succeeds instantly — no processor, no blockchain)
- `GET /referrals`
- `GET /games`, `GET /games/:slug/launch` (returns a placeholder launch
  shape only)
