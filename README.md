# Casino Launcher UI/API — EDUCATIONAL DEMO

> **This is not a real gambling product.** No real money, no real payment
> processors, no KYC/AML, no licensing, no game logic. It exists to
> demonstrate — for an educational/YouTube walkthrough — how quickly a
> modern "casino aggregator" style front end (login, lobby, wallet,
> deposits, referrals) can be scaffolded. **Never connect it to real
> payments or represent it as a licensed gambling service.** Anyone doing
> that is responsible for the legal consequences themselves — this repo
> provides none of the licensing, age-verification, or compliance work that
> real-money gambling requires in every jurisdiction. Showing it publicly
> as a demo is fine as long as the disclaimers stay; follow
> [SECURITY.md](SECURITY.md) when you do.

![NovaSpin demo lobby](docs/lobby.png)

## What's here

A monorepo mimicking the tech shape of typical iframe-based casino
aggregator launchers (a lobby site that loads third-party game clients in
an iframe, e.g. `?gameid=...&mode=demo&token=...`).

### `apps/web` — Vue 3 + Vite + Pinia + Tailwind CSS

Styled like a modern crypto-casino lobby: dark navy theme, collapsible
sidebar, balance + wallet button in the top bar, bottom nav on mobile.

- **Lobby** — promo banners, category tabs, scrollable game rows, provider
  filter and sorting, favourites and recently played (stored in the
  browser), a search overlay (`/` or Ctrl+K).
- **Game page** — animated launch splash, then the iframe slot left as a
  placeholder (no game clients are wired up).
- **Wallet** — fake "crypto pay" deposit modal that instantly credits the
  balance (no blockchain, no processor), history with filters and CSV
  export.
- **Refer & Earn** — personal link/code, share buttons, invited friends and
  earnings; the register page validates codes live and shows who invited
  you.
- **Notifications** — a bell that polls the wallet, so a friend signing up
  with your link pops up live; toasts for actions.
- **Chat** — right-hand panel (full screen on mobile) with English and
  Polish rooms, chat rules, and server-side moderation (no shouting, no
  link shorteners, no repeats, rate-limited).
- **Providers** — a providers page and one page per studio with its games.
- **Help Center** — searchable FAQ in both languages, reachable signed in or
  out.
- **Settings**, in tabs:
  - *General* — avatar, username, streamer mode (masks every balance on
    screen — handy when recording), compact sidebar, language.
  - *Security* — password change (signs out other devices), two-factor
    authentication with any TOTP app (QR code or setup key), active
    sessions with "sign out" / "sign out all other devices".
  - *Responsible play* — a daily deposit limit enforced by the API, a
    "reality check" reminder with session time and deposits, and "take a
    break" (1 hour to 30 days: signed out everywhere, sign-in refused until
    it ends).
  - *Privacy* — ghost mode (hidden name in chat), clearing browser data,
    account deletion.
- **Polish/English UI** — auto-detected from the browser, switchable in the
  sidebar, Settings, footer and auth screens (`apps/web/src/i18n`).
- Game cover art is generated from each title (SVG emblem + palette), so no
  third-party artwork ships with the repo.

### `apps/api` — Fastify + Prisma + SQLite

Sessions in an httpOnly cookie, each bound to a revocable session row,
TOTP two-factor auth (RFC 6238, no third-party OTP library), break in
play, account deletion, wallet/balance ledger with deposit limits,
referral codes + rewards, profile/password updates, chat rooms with
moderation, and a `/games` catalog serving placeholder metadata with a
`launchPath` shaped for an iframe game client.
Endpoints are listed in `apps/api/README.md`.

### `packages/shared`

Rules (password, username and chat limits, deposit bounds, break lengths),
avatar keys, the API's response types and its error-code catalog. Both
apps import it, so a form can't accept what the API rejects, and every
error code has an English and a Polish message (a test checks).

### Built to be shown publicly

A demo on the internet gets attacked, so it's hardened against takeover and
abuse, and was checked by two independent adversarial reviews. Details and
the threat model are in [SECURITY.md](SECURITY.md):

- **One origin:** nginx serves the app and proxies `/api`; the API has no
  public port. Sessions are httpOnly, SameSite=Strict cookies (`__Host-`
  over HTTPS), so page scripts never see a token. On top of that, the API
  refuses cross-site requests.
- The published demo logins are **shared accounts**: anyone can use them,
  nobody can change their password, 2FA or profile, lock them with a break
  or a limit, delete them, or see other visitors' sessions.
- **Sign-in protection:** rate limits per IP and per account; device
  cookies, so attackers can't lock real users out; one-time 2FA codes;
  common passwords refused; look-alike usernames blocked.
- **Resilience:** bounded password hashing under floods, race-free
  balances and limits, strict input schemas, capped fake balances,
  expiring chat.
- **Headers:** a CSP that allows only this origin (the font is
  self-hosted), plus the usual security headers everywhere.
- **Containers:** non-root, read-only, capability-free, production
  dependencies only, base images pinned by digest.
- **CI:** read-only CI token, pinned actions, dependency audit, and secret
  scanning of files, archives and history.
- **Operations:** kill switches (`DISABLE_REGISTRATION`, `DISABLE_CHAT`) and
  an operator CLI to ban users, clear chat and sign everyone out.

## Running locally

One command, from a fresh clone:

```bash
npm start
```

That installs dependencies for both apps, creates `apps/api/.env` (with a
random JWT secret), sets up
the local SQLite database (migrate + seed 48 placeholder games), starts the
API on `http://localhost:8787` and the web app on `http://localhost:5173`,
and opens the web app in your browser. Ctrl+C stops both servers.

Re-running `npm start` later is safe and fast (it skips `.env` creation if
it already exists, and the database setup is idempotent).

A demo login is seeded automatically so you don't need to register on
camera:

- **Email:** `demo@novaspin.test`
- **Password:** `demo1234`
- Comes pre-loaded with a $50,000 fake balance, plus three seeded friends it
  "invited" (so the Refer & Earn page isn't empty) and their $5,000 demo
  referral bonuses each.
- The friends can log in too: `friend1@novaspin.test` … `friend3@novaspin.test`,
  same password.
- The chat rooms start with a few neutral messages from them.
- These logins are shared: their password, profile, 2FA, limits and breaks
  can't be changed (register your own account to show those features), and
  every `npm start` / container start puts them back to the state above.

To show the referral flow live, copy the link from **Refer & Earn** (e.g.
`http://localhost:5173/register?ref=DEMO0001`), open it in a private window
and register: the form confirms who invited you, the new account gets the
demo welcome bonus and the referrer's dashboard picks up the new friend.
Referral links are built from `WEB_ORIGIN` in `apps/api/.env`.

### Docker

```bash
docker compose up --build
```

Open `http://localhost:8080`. That's the only published port: nginx serves
the app and forwards `/api` to the API, which isn't reachable from outside.
SQLite lives in a named volume (`api-data`), and the API migrates and seeds
on every start. Without `JWT_SECRET` it generates a random one per start
(you just sign in again after a restart); set `JWT_SECRET` to keep
sessions. Both containers run as non-root users on read-only filesystems.
For a public host, see the checklist in
[SECURITY.md](SECURITY.md#hosting-checklist).

Upgrading from an older image whose volume belonged to root? The API says
so on start; fix it once with
`docker compose run --rm --user root api chown -R node:node /data`.

### Running the pieces separately

If you'd rather run things by hand — see `apps/api/README.md` and
`apps/web/README.md`.

## Tests

```bash
npm run typecheck   # API (incl. tests + seed) and web
npm test            # Vitest: API integration tests + web unit tests
npm run test:e2e    # Playwright end-to-end suite
```

- **API** (`apps/api/test`) — drives the Fastify app with `app.inject()`
  against a throwaway SQLite DB migrated fresh per run: auth, profile,
  password change, rate limiting, referrals, wallet limits, games,
  sessions, two-factor auth (including the RFC 6238 test vectors), break
  in play, account deletion, chat moderation and ghost mode — plus the
  hardening: security headers, body limits, forged/expired tokens, the
  per-account throttle, `X-Forwarded-For` handling, shared-account
  protection, bans (via the operator CLI), kill switches, the balance
  cap, the production secret check, cookie sessions, CSRF, the error
  contract, 2FA replay, device cookies, impersonation, races and floods.
- **Web** (`apps/web/src/**/*.test.ts`) — i18n (plurals, fallbacks, and a
  check that every key used in the code exists in both languages),
  formatting, transaction notes, game art, categories, avatars, help
  content parity, user-agent labels.
- **E2E** (`e2e/`) — starts its own API on :8788 with a freshly seeded DB
  and a web dev server on :5174, so it runs fine next to `npm start`.
  Covers sign-in, referral sign-up, search, favourites, deposits and
  limits, CSV export, live referral notifications, settings, reality
  check, 2FA sign-in, sessions, break in play, account deletion, chat,
  providers, Help Center, the Polish UI, the read-only shared demo
  account and the common-password check.

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, unit tests and
builds, a production dependency audit and a gitleaks secret scan, then the
Playwright suite and a Docker smoke test (the compose stack comes up
healthy, serves the security headers and runs as non-root), on pushes to
`main` and on pull requests. Dependabot proposes dependency updates weekly.
