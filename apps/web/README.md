# Web (demo)

Vue 3 + Vite + Pinia + Tailwind CSS. Login/register, game lobby with
placeholder tiles, wallet with a fake "crypto pay" top-up, and a referral
dashboard.

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. The app calls `/api` on its own origin and
the dev server forwards it to the API on `http://localhost:8787` (override
with `API_PROXY_TARGET`), the same shape as nginx in Docker. The session is
an httpOnly cookie: no token is ever stored or handled in JavaScript.
Shared rules, types and error codes come from `@novaspin/shared`.

In Docker, `render-nginx-conf.sh` fills in `API_UPSTREAM` (where `/api`
goes) and `TRUSTED_PROXIES` (proxies allowed to report the visitor's IP)
at build time.

`npm test` runs the Vitest unit tests; `npm run typecheck` runs `vue-tsc`.
UI strings live in `src/i18n/en.ts` and `src/i18n/pl.ts` — `pl.ts` is typed
against `en.ts`, and a unit test fails if code uses a key that's missing in
either language.

The amber banner at the top of every page is intentional and should stay —
this is a demo, not a real product.
