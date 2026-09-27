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

![NovaSpin demo lobby](docs/lobby.png)

## What's here

A monorepo mimicking the tech shape of typical iframe-based casino
aggregator launchers (a lobby site that loads third-party game clients in
an iframe, e.g. `?gameid=...&mode=demo&token=...`):

- `apps/web` — Vue 3 + Vite + Pinia + Tailwind CSS, styled like a modern
  crypto-casino lobby (dark navy theme, collapsible sidebar, balance +
  wallet button in the top bar, mobile bottom nav). Login/register, a game
  lobby with promo banners, search, category tabs and scrollable game rows,
  favourites/recently played (stored in the browser), provider filter and
  sorting in category grids, a search overlay (`/` or Ctrl+K), toast
  notifications, a notification bell that polls the wallet (a friend
  signing up with your link pops up live), a settings page (edit username,
  change password, "streamer mode" that masks every balance on screen —
  handy when recording), responsible-play tools (a daily deposit limit the
  API enforces, and a "reality check" reminder showing session time and
  deposits), wallet history filters with CSV export, a 404 page, an
  animated launch splash on the game page, a full Polish/English UI
  (auto-detected from the browser, switchable in the sidebar, Settings,
  footer and on the auth screens — dictionaries in `apps/web/src/i18n`), a game page with the iframe slot left as a placeholder, a wallet page + a fake "crypto pay"
  deposit modal that always instantly credits the balance (no blockchain,
  no processor — it's a demo button), and a referral dashboard (code,
  invited users, earned bonus). Game cover art is generated procedurally
  from each title (SVG emblem + palette), so no third-party artwork ships
  with the repo.
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

To show the referral flow live, copy the link from **Refer & Earn** (e.g.
`http://localhost:5173/register?ref=DEMO0001`), open it in a private window
and register: the form confirms who invited you, the new account gets the
demo welcome bonus and the referrer's dashboard picks up the new friend.
Referral links are built from `WEB_ORIGIN` in `apps/api/.env`.

### Running the pieces separately

If you'd rather run things by hand — see `apps/api/README.md` and
`apps/web/README.md`.
