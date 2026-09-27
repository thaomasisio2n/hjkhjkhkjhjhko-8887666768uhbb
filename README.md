# Casino Launcher UI/API — EDUCATIONAL DEMO

> **This is not a real gambling product.** No real money, no real payment
> processors, no KYC/AML, no licensing, no game logic. It exists to
> demonstrate — for an educational/YouTube walkthrough — how quickly a
> modern "casino aggregator" style front end (login, lobby, wallet,
> deposits, referrals) can be scaffolded. **Do not deploy this publicly,
> connect it to real payments, or represent it as a licensed gambling
> service.** Anyone doing that is responsible for the legal consequences
> themselves — this repo provides none of the licensing, age-verification,
> or compliance work that real-money gambling requires in every
> jurisdiction.

## What's here

A monorepo mimicking the tech shape of typical iframe-based casino
aggregator launchers (a lobby site that loads third-party game clients in
an iframe, e.g. `?gameid=...&mode=demo&token=...`):

- `apps/web` — Vue 3 + Vite + Pinia + Tailwind CSS. Login/register, game
  lobby with placeholder game tiles (grouped by fake "provider"), a wallet
  view, a fake "crypto pay" top-up modal that always instantly credits the
  balance (no blockchain, no processor — it's a demo button), and a
  referral dashboard (code, invited users, earned bonus).
- `apps/api` — Fastify + Prisma + SQLite. JWT auth, wallet/balance ledger,
  referral codes + rewards, and a `/games` catalog endpoint serving
  placeholder game metadata (title, provider, thumbnail placeholder, and a
  `launchUrl` shape compatible with an iframe-embedded game client —
  intentionally left for someone else to wire up to actual game builds).

## Running locally

One command, from a fresh clone:

```bash
npm start
```

That installs dependencies for both apps, creates `apps/api/.env`, sets up
the local SQLite database (migrate + seed 20 placeholder games), starts the
API on `http://localhost:8787` and the web app on `http://localhost:5173`,
and opens the web app in your browser. Ctrl+C stops both servers.

Re-running `npm start` later is safe and fast (it skips `.env` creation if
it already exists, and the database setup is idempotent).

### Running the pieces separately

If you'd rather run things by hand — see `apps/api/README.md` and
`apps/web/README.md`.
