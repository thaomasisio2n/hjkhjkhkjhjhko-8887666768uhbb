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
- `PATCH /auth/me` (display name, avatar preset key — `null` resets it —
  and/or `ghostMode`), `POST /auth/password` (needs the current password;
  signs out other sessions), `DELETE /auth/me` (needs the password)
- `POST /auth/logout`; `GET /auth/sessions`, `DELETE /auth/sessions/:id`,
  `POST /auth/sessions/revoke-others` — JWTs carry a session id and are
  checked against the `Session` table on every request
- `POST /auth/2fa/setup` (secret, otpauth URL and QR SVG),
  `POST /auth/2fa/enable` / `POST /auth/2fa/disable` with `{ code }`; once
  enabled, `POST /auth/login` answers `TOTP_REQUIRED` / `TOTP_INVALID`
  until a valid `code` is sent
- `POST /auth/break` with `{ duration: "1h" | "24h" | "7d" | "30d" }` —
  revokes all sessions; sign-in returns `403 ON_BREAK` until it ends
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
- `GET /chat/:room` (`en` or `pl`; pass `?after=<ISO time>` to poll for new
  messages) and `POST /chat/:room` with `{ body }` — max 240 characters,
  no shouting, no link shorteners, no repeats within 30s, rate-limited

Login, register, password change and referral lookups are rate-limited per
IP (see `RATE_LIMITS` in `src/config.ts`; `RATE_LIMIT_SCALE` multiplies
them, which the e2e suite uses).
