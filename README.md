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

```bash
npm install
cp apps/api/.env.example apps/api/.env
npm run build:api --workspace=apps/api -- prisma:generate # or see apps/api/README
npm run dev:api
npm run dev:web
```

See `apps/api/README.md` and `apps/web/README.md` for details.
