# Security

NovaSpin is an **educational demo**: no real money, no real payments, no
real games. It may be shown publicly as a portfolio/showcase piece as long
as the "educational demo" disclaimers stay visible. It must never be wired
to real payments or presented as a licensed gambling service.

Because a public demo gets poked at by strangers, it's built so that
nobody can take it over, lock other visitors out, or turn it against
them. This page lists what is protected, what isn't, and how to host it
safely.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** (Security tab →
"Report a vulnerability") rather than a public issue. Include steps to
reproduce; you'll get a reply as soon as possible.

## What's protected

| Threat | Mitigation |
| --- | --- |
| Taking over the shared demo login (its password is published) | Seeded accounts are flagged `shared`: password, profile, 2FA, breaks, deposit limits, "sign out other devices" and deletion are refused by the API (and shown read-only in the UI). Other visitors' sessions and IPs are hidden. Every start (Docker or `npm start`) re-runs the seed, which restores their published state. They're exempt from the per-account sign-in throttle, so nobody can lock them. |
| Guessing someone's password | argon2 hashes; per-IP rate limits; a per-email failure throttle across all IPs (wrong 2FA codes count); common passwords refused; optional TOTP 2FA; a miss on an unknown email costs the same time as a wrong password. |
| Forged or stolen tokens | HS256 pinned (no `alg: none`/confusion), 7-day expiry, every token bound to a revocable session row; password change, breaks and bans revoke sessions. The API won't start in production with the default or a short `JWT_SECRET`. |
| Cross-site scripting | Vue escapes all output; no user-supplied HTML is ever rendered; strict Content-Security-Policy on the web app (only our own scripts, API calls only to the API origin); the API itself answers with `default-src 'none'`. |
| Clickjacking | `frame-ancestors 'none'` and `X-Frame-Options: DENY` on both apps. |
| Dodging rate limits with a fake `X-Forwarded-For` | Only trusted when `TRUST_PROXY` says how many proxies sit in front. |
| Flooding and resource abuse | Global per-IP rate limit plus tighter per-route ones, 16 KB API bodies, fake balances capped at $10M (the column is 32-bit), chat messages expire after 7 days, stale session rows are pruned, the referral list is bounded. |
| Abuse in chat and usernames | Server-side chat rules (length, shouting, link shorteners, repeats, rate limit); usernames can't contain links, staff titles ("admin", "support", …) or invisible/bidi characters; operator CLI to ban users and delete messages; kill switches for sign-ups and chat. |
| Error details leaking | 5xx and 404 answers are generic; details only go to the server log. |
| A compromised container | Both images run as non-root users; compose adds a read-only root filesystem, drops all Linux capabilities and sets `no-new-privileges`. Only the database volume and `/tmp` are writable. |
| Vulnerable or leaked dependencies/secrets | CI fails on high/critical advisories in production dependencies (`npm audit --omit=dev`) and on secrets found by gitleaks; Dependabot opens weekly update PRs. |
| Showing up in search results | `X-Robots-Tag: noindex`, `robots.txt` and meta robots. |

## Known limits

Honest list of what this demo does **not** do:

- **One instance only.** SQLite, plus in-memory rate-limit and sign-in
  throttle counters: they reset on restart and aren't shared between
  replicas. Don't scale it horizontally.
- **No email verification.** Emails are never sent, so anyone can register
  with any address. Accounts only hold fake balances.
- **Tokens live in `localStorage`.** An XSS bug would expose them; the CSP
  and Vue's escaping are the defence.
- **Chat moderation is basic.** No profanity filter or reporting flow;
  moderation is the operator CLI and the kill switch.
- **Sign-ups can be farmed** for fake balances and referral bonuses, within
  the rate limits and the balance cap. It's fake money.
- **Google Fonts** is loaded from Google (the only third-party request).

## Hosting checklist

1. **Secret:** set `JWT_SECRET` to a long random value and keep it out of
   git:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
2. **URLs:** set `WEB_ORIGIN` to the public web address (CORS and
   referral links) and build the web image with `VITE_API_URL` set to the
   public API address (the CSP is generated from it).
3. **TLS:** put HTTPS in front of both apps (your platform's proxy, Caddy,
   nginx…). Don't expose ports 8080/8787 to the internet directly.
4. **Proxy:** set `TRUST_PROXY=1` when exactly one proxy sits in front of
   the API (more hops: that number, or the proxies' IPs/CIDRs). Leave it
   unset otherwise.
5. **Keep the disclaimers.** Don't remove the "educational demo" banner or
   the notes in the UI.
6. **Updates:** merge Dependabot PRs once CI is green; rebuild images
   regularly for OS patches.
7. **Watch the logs** now and then (`docker compose logs api`).

With Docker Compose all of this is environment variables:

```bash
JWT_SECRET=… WEB_ORIGIN=https://demo.example.com \
VITE_API_URL=https://api.demo.example.com TRUST_PROXY=1 \
docker compose up -d --build
```

## If something goes wrong

| Situation | Action |
| --- | --- |
| Spam or abuse in chat | `admin chat:recent`, then `admin chat:delete <id>`, `admin ban <email>`, or `admin chat:purge`; set `DISABLE_CHAT=1` and restart to pause posting. |
| Wave of junk sign-ups | Set `DISABLE_REGISTRATION=1` and restart; ban offenders. |
| Suspected leaked `JWT_SECRET` or tokens | Rotate `JWT_SECRET` and restart (every token becomes invalid), and run `admin sessions:revoke-all`. |
| Shared demo account's fake balance hits the cap | `admin balance:set demo@novaspin.test 50000` |

`admin` is `npm run admin --` locally, or
`docker compose exec api node dist/cli/admin.js` in Docker. See
[`apps/api/README.md`](apps/api/README.md#operator-cli).
