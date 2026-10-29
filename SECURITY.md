# Security

NovaSpin is an **educational demo**: no real money, no real payments, no
real games. It may be shown publicly as a portfolio/showcase piece as long
as the "educational demo" disclaimers stay visible. It must never be wired
to real payments or presented as a licensed gambling service.

A public demo gets attacked, so it's built so that nobody can take it over,
lock other visitors out, or turn it against them. This page covers how it
works, what it defends against, what it doesn't, and how to host it
safely. The code was reviewed by two independent adversarial audits
(backend; frontend, infrastructure and supply chain). Every finding is fixed
and covered by tests.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** (Security tab →
"Report a vulnerability") rather than a public issue. Include steps to
reproduce.

## Architecture in one paragraph

Visitors only ever talk to one origin: an unprivileged nginx that serves
the built app and forwards `/api` to the API on an internal network. The
API has no public port. Sessions are an **httpOnly, SameSite=Strict cookie**
(`Secure` with the `__Host-` prefix on an HTTPS site). Page scripts can never
read it, and other sites can't send it. There is no CORS, because nothing
cross-origin is ever allowed.

## What's protected

| Threat | Mitigation |
| --- | --- |
| **Stealing a session** (XSS, malicious extensions reading storage) | The token is never in JavaScript: httpOnly cookie, never in a response body, no bearer header accepted. Nothing sensitive is in `localStorage`. |
| **Taking over the shared demo login** (its password is published) | Seeded accounts are flagged `shared`: password, profile, 2FA, breaks, deposit limits, "sign out other devices" and deletion are refused by the API and shown read-only in the UI. Other visitors' sessions and IPs are hidden. If a visitor fills the fake balance to the cap, it starts over. Every start re-runs the seed, which restores its published state. It's exempt from the per-account throttle, so nobody can lock it. |
| **Cross-site request forgery** | SameSite=Strict cookie, plus the API refuses any state-changing request a browser marks as coming from another origin or site (`Origin` / `Sec-Fetch-Site`). |
| **Guessing passwords** | argon2id (OWASP parameters). Per-IP rate limits. A per-email failure throttle across all IPs, which wrong 2FA codes also count toward and junk keys can't flush. Common passwords refused. Optional TOTP 2FA. A miss on an unknown email costs the same time as a wrong password. |
| **Locking a real user out on purpose** | "Device cookies" (OWASP): a browser that signed in to the account before gets past the per-email throttle, so an attacker's failures only block the attacker. |
| **2FA code theft** | Each code works once: the time step is burned atomically on use, so a shoulder-surfed or phished code can't be replayed. Setup/enable can't race each other into an unknown secret. |
| **Forged tokens** | HS256 pinned (no `alg: none`/confusion), 7-day expiry, every token bound to a revocable session row. The public default secret is never used (a random one is generated), and production refuses to start without an explicit ≥32-character secret. |
| **Impersonation** | Usernames are NFKC-normalised and limited to Latin letters (Polish included), digits and `. _ ' -`. That rules out homoglyphs ("Аdmin" in Cyrillic), fullwidth tricks, invisible and direction-flipping characters, staff titles, links, and copies of the demo accounts' names. Chat strips invisible/bidi characters and "zalgo". |
| **XSS** | Vue escapes all output; no user HTML is ever rendered. A strict Content-Security-Policy allows only this origin: no inline scripts, no third parties (the font is self-hosted). The API answers with `default-src 'none'`. |
| **Clickjacking** | `frame-ancestors 'none'` and `X-Frame-Options: DENY` everywhere. |
| **Faking an IP to dodge rate limits** | nginx overwrites `X-Forwarded-For` with the connecting address, and only takes a forwarded one from proxies listed in `TRUSTED_PROXIES`. The API trusts exactly that one hop, and nothing else can reach it. |
| **Floods and resource exhaustion** | Global and per-route per-IP rate limits. At most 4 argon2 hashes run at once with a bounded queue, and beyond that the answer is "server busy" instead of running out of memory. 16 KB bodies. nginx drops slow clients (header/body timeouts). Fake balances capped at $10M, chat messages expire after 7 days, stale sessions are pruned, lists are bounded. |
| **Races** | Balance cap and bonuses are enforced inside the SQL `UPDATE`; top-ups are serialised per user so parallel requests can't slip past the daily limit. |
| **Mass assignment / bad input** | Every body, query and param goes through a strict zod schema (unknown fields are rejected), and every error answers with a stable code. |
| **Error details leaking** | 5xx and 404 answers are generic; details only go to the server log. Security events (failed/throttled sign-ins, replayed 2FA codes, cross-site attempts, rate limits) are logged with a `security` field and hashed emails. |
| **Path tricks** | URL slugs are validated before they become part of an API path; nginx blocks dotfiles, never lets a regex rule take over `/api`, and sends relative redirects only. |
| **A compromised container** | Both images run as non-root, and the API image holds production dependencies and compiled output only. Compose sets read-only root filesystems, drops all Linux capabilities and sets `no-new-privileges`. Only the database volume and `/tmp` are writable. |
| **Supply chain** | Base images pinned by digest and GitHub Actions pinned to commit SHAs (Dependabot updates both, plus npm). CI runs with a read-only token that isn't left on disk. The gitleaks binary is checksum-verified. CI fails on high/critical advisories in production dependencies and on secrets in files, inside archives, or anywhere in git history. |
| **Showing up in search results** | `X-Robots-Tag: noindex`, `robots.txt` and meta robots. |

## Known limits

An honest list of what this demo does **not** do:

- **One instance only.** SQLite, plus in-memory rate-limit, throttle and
  lock state: it resets on restart and isn't shared between replicas.
  Don't scale it horizontally.
- **No email verification.** Emails are never sent, so anyone can register
  with any address, and sign-up reveals whether an address is taken
  (rate-limited). Accounts only hold fake balances.
- **Chat moderation is basic.** No profanity filter or reporting flow.
  Moderation is the operator CLI and the kill switch.
- **Sign-ups can be farmed** for fake balances and referral bonuses, within
  the rate limits and the balance cap. It's fake money.
- **Volumetric DDoS** is beyond what one small server can absorb. Put a
  CDN/WAF (e.g. Cloudflare) in front for that; see the checklist.

## Hosting checklist

1. **Secret:** set `JWT_SECRET` to a long random value and keep it out of
   git:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
2. **Address:** set `WEB_ORIGIN` to the public address, e.g.
   `https://demo.example.com`. It drives the CSRF check and referral links,
   and an `https://` origin switches the cookies to `Secure` + `__Host-`.
3. **TLS:** serve it over HTTPS (your platform's proxy, Caddy, or a CDN).
   Publish only the web container; never expose the API.
4. **Proxies:** if a TLS proxy or CDN sits in front of the web container,
   build it with `TRUSTED_PROXIES` set to that proxy's IPs/CIDRs (for
   Cloudflare, its published ranges). Then the real visitor IP is used for
   rate limits. Leave it empty when visitors connect directly. Also firewall
   the origin so only that proxy can reach it.
5. **Keep the disclaimers.** Don't remove the "educational demo" banner or
   the notes in the UI.
6. **Updates:** merge Dependabot PRs once CI is green, and rebuild images
   regularly.
7. **Watch the logs** now and then:
   `docker compose logs api | grep security`.

With Docker Compose all of this is environment variables:

```bash
JWT_SECRET=… WEB_ORIGIN=https://demo.example.com TRUSTED_PROXIES=203.0.113.0/24 \
docker compose up -d --build
```

## If something goes wrong

| Situation | Action |
| --- | --- |
| Spam or abuse in chat | `admin chat:recent`, then `admin chat:delete <id>`, `admin ban <email>`, or `admin chat:purge`; set `DISABLE_CHAT=1` and restart to pause posting. |
| Wave of junk sign-ups | Set `DISABLE_REGISTRATION=1` and restart; ban offenders. |
| Credential-stuffing or other attacks | `docker compose logs api \| grep security` shows who and what; bans and kill switches as above; a CDN/WAF rule for persistent sources. |
| Suspected leaked `JWT_SECRET` | Rotate `JWT_SECRET` and restart (every session becomes invalid), then run `admin sessions:revoke-all`. |

`admin` is `npm run admin --` locally, or
`docker compose exec api node dist/cli/admin.js` in Docker. See
[`apps/api/README.md`](apps/api/README.md#operator-cli).
