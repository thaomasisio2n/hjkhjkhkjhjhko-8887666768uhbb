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
- `GET /config` — public: `{ registrationOpen, chatOpen }` (kill switches)
- `GET /health`

Seeded logins (demo + friends) are **shared**: `PATCH /auth/me`, password,
2FA, break, deletion, sign-out-others and deposit limits answer
`403 SHARED_ACCOUNT` for them, and `GET /auth/sessions` only lists the
caller's own session.

## Limits and hardening

- Per-IP rate limits (see `RATE_LIMITS` in `src/config.ts`; a global
  backstop plus tighter ones on login, register, password, 2FA, top-ups,
  lookups and chat). `RATE_LIMIT_SCALE` multiplies them (the e2e suite
  uses it).
- Failed sign-ins are also counted per email across all IPs: 10 in 15
  minutes pauses that email (`429 ACCOUNT_THROTTLED`); wrong 2FA codes
  count too. Shared accounts are exempt, so nobody can lock them.
- JWTs are HS256-only and expire after 7 days; each is bound to a
  revocable session row.
- 16 KB request bodies, strict security headers, `Cache-Control:
  no-store`, and generic bodies for 404/5xx.
- Common passwords are refused; emails are case-insensitive; usernames
  can't contain links, staff titles or invisible characters.
- Fake balances are capped at $10,000,000.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file, e.g. `file:./dev.db` |
| `JWT_SECRET` | Token signing key. With `NODE_ENV=production` the API refuses to start unless it's at least 32 characters and not the default. |
| `WEB_ORIGIN` | The web app's public origin: CORS and referral links |
| `TRUST_PROXY` | Number of reverse proxies in front (e.g. `1`), or their IPs/CIDRs. Leave unset when clients connect directly, otherwise `X-Forwarded-For` can be spoofed to dodge rate limits. |
| `DISABLE_REGISTRATION`, `DISABLE_CHAT` | Set to `1` to pause sign-ups or chat posting |
| `WELCOME_BONUS_CENTS`, `REFERRAL_BONUS_CENTS` | Demo economy |

## Operator CLI

No admin UI (no extra login to attack). Run where the database lives:

```bash
npm run admin -- ban someone@example.com     # local
docker compose exec api node dist/cli/admin.js ban someone@example.com   # Docker
```

Commands: `ban`, `unban`, `sessions:revoke <email>`, `sessions:revoke-all`,
`chat:recent [room] [n]`, `chat:delete <id>`, `chat:purge [room]`,
`balance:set <email> <dollars>`. Run it without arguments for help.
