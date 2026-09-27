import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { MAX_BALANCE_CENTS } from "@novaspin/shared";
import { trustProxySetting } from "../src/config.js";
import { FailureThrottle } from "../src/lib/throttle.js";
import { TEST_PASSWORD, cookieFor, makeApp, register, sessionToken, uniqueEmail } from "./helpers.js";

let app: FastifyInstance;
// Plenty of sign-ups per "IP" here; the limits themselves are tested separately.
beforeAll(async () => (app = await makeApp({ limits: { register: 1000 } })));
afterAll(async () => app.close());

const login = (a: FastifyInstance, payload: Record<string, string>, headers: Record<string, string> = {}) =>
  a.inject({ method: "POST", url: "/auth/login", payload, headers });
const me = (token: string) => app.inject({ method: "GET", url: "/auth/me", headers: cookieFor(token) });

// Hand-rolled JWTs, to check the API rejects tokens it didn't issue.
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
function craftToken(payload: object, { alg = "HS256", secret = "test-secret" } = {}) {
  const head = `${b64url({ alg, typ: "JWT" })}.${b64url(payload)}`;
  if (alg === "none") return `${head}.`;
  return `${head}.${createHmac("sha256", secret).update(head).digest("base64url")}`;
}
const decode = (token: string) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

let sharedCount = 0;
async function sharedAccount() {
  // Unique names: nobody may register a name a shared account uses.
  const account = await register(app, { displayName: `Shared Demo ${++sharedCount} ${Date.now()}` });
  await app.prisma.user.update({ where: { id: account.user.id }, data: { shared: true } });
  return account;
}

describe("HTTP hardening", () => {
  it("sends strict security headers and no-store on every response", async () => {
    for (const res of [
      await app.inject({ method: "GET", url: "/health" }),
      await app.inject({ method: "GET", url: "/auth/me" }),
    ]) {
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      expect(res.headers["cache-control"]).toBe("no-store");
    }
  });

  it("rejects oversized bodies before they reach a route", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "a@b.test", password: "x".repeat(20_000) },
    });
    expect(res.statusCode).toBe(413);
  });

  it("answers unknown routes and server errors without leaking details", async () => {
    const boom = await buildApp({ logger: false });
    boom.get("/boom", async () => {
      throw new Error("SQLITE_CORRUPT at /data/novaspin.db");
    });
    await boom.ready();
    try {
      const res = await boom.inject({ method: "GET", url: "/boom" });
      expect(res.statusCode).toBe(500);
      expect(res.body).not.toContain("SQLITE");
      expect(res.body).not.toContain("novaspin.db");

      const missing = await boom.inject({ method: "GET", url: "/admin" });
      expect(missing.statusCode).toBe(404);
      expect(missing.json()).toEqual({ error: "Not found", code: "NOT_FOUND" });
    } finally {
      await boom.close();
    }
  });

  it("puts a global per-IP ceiling on every route except /health", async () => {
    const limited = await makeApp({ limits: { global: 3 } });
    try {
      for (let i = 0; i < 3; i++) expect((await limited.inject({ method: "GET", url: "/games" })).statusCode).toBe(200);
      expect((await limited.inject({ method: "GET", url: "/games" })).statusCode).toBe(429);
      expect((await limited.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    } finally {
      await limited.close();
    }
  });

  it("only trusts X-Forwarded-For when told how many proxies sit in front", async () => {
    expect(trustProxySetting("")).toBe(false);
    expect(trustProxySetting("10.0.0.0/8, 172.16.0.0/12")).toEqual(["10.0.0.0/8", "172.16.0.0/12"]);
    expect(() => trustProxySetting("true")).toThrow(/hop count/);

    const bad = { email: "nobody@test.local", password: "wrong-password" };
    // Direct exposure: a spoofed header must not buy a fresh rate-limit bucket.
    const direct = await makeApp({ limits: { login: 2 } });
    // Behind one proxy: each real client gets its own bucket.
    const proxied = await makeApp({ limits: { login: 2 }, trustProxy: trustProxySetting("1") });
    try {
      for (let i = 0; i < 2; i++) await login(direct, bad, { "x-forwarded-for": `203.0.113.${i}` });
      expect((await login(direct, bad, { "x-forwarded-for": "203.0.113.99" })).statusCode).toBe(429);

      for (let i = 0; i < 2; i++) await login(proxied, bad, { "x-forwarded-for": "198.51.100.1" });
      expect((await login(proxied, bad, { "x-forwarded-for": "198.51.100.1" })).statusCode).toBe(429);
      expect((await login(proxied, bad, { "x-forwarded-for": "198.51.100.2" })).statusCode).toBe(401);
    } finally {
      await direct.close();
      await proxied.close();
    }
  });
});

describe("tokens", () => {
  it("issues HS256 tokens that expire after 7 days", async () => {
    const { token } = await register(app);
    const payload = decode(token);
    expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
  });

  it("rejects expired, unsigned, and foreign-secret tokens even for a live session", async () => {
    const { token } = await register(app);
    const { sub, sid } = decode(token);
    const now = Math.floor(Date.now() / 1000);

    expect((await me(craftToken({ sub, sid, iat: now }))).statusCode).toBe(200); // sanity: the forger works
    expect((await me(craftToken({ sub, sid, iat: now - 100, exp: now - 10 }))).statusCode).toBe(401);
    expect((await me(craftToken({ sub, sid, iat: now }, { alg: "none" }))).statusCode).toBe(401);
    expect((await me(craftToken({ sub, sid, iat: now }, { secret: "change-me-in-real-life-this-is-a-demo" }))).statusCode).toBe(401);
  });

  it("clears out session rows past the token lifetime on the next sign-in", async () => {
    const account = await register(app);
    await app.prisma.session.updateMany({
      where: { userId: account.user.id },
      data: { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    await login(app, { email: account.payload.email, password: TEST_PASSWORD });
    expect(await app.prisma.session.count({ where: { userId: account.user.id } })).toBe(1);
  });
});

describe("credentials", () => {
  it("treats emails case-insensitively", async () => {
    const email = uniqueEmail("MiXeD").replace("@test.local", "@Test.Local");
    const created = await register(app, { email: `  ${email} ` });
    expect(created.res.statusCode).toBe(201);
    expect(created.user.email).toBe(email.toLowerCase());

    expect((await register(app, { email: email.toUpperCase() })).res.statusCode).toBe(409);
    expect((await login(app, { email: email.toUpperCase(), password: TEST_PASSWORD })).statusCode).toBe(200);
  });

  it("refuses the most common passwords", async () => {
    for (const password of ["password123", "12345678", "Qwertyuiop", "aaaaaaaaaa"]) {
      const { res } = await register(app, { password });
      expect(res.statusCode, password).toBe(400);
      expect(JSON.stringify(res.json())).toContain("too common");
    }
    const { token } = await register(app);
    const change = await app.inject({
      method: "POST",
      url: "/auth/password",
      headers: cookieFor(token),
      payload: { currentPassword: TEST_PASSWORD, newPassword: "iloveyou1" },
    });
    expect(change.statusCode).toBe(400);
  });

  it("keeps links, staff titles and invisible characters out of usernames", async () => {
    for (const displayName of ["NovaSpin Support", "Admin", "free coins at spin.xyz", "https://x.test", "Bob‮evil", "a​b"]) {
      expect((await register(app, { displayName })).res.statusCode, displayName).toBe(400);
    }
    expect((await register(app, { displayName: "Zofia Kowalska" })).res.statusCode).toBe(201);
  });
});

describe("per-account sign-in throttle", () => {
  it("pauses an email after repeated failures, from any IP, known or not", async () => {
    const throttled = await makeApp({ limits: { login: 1000, loginFailures: 3 } });
    try {
      const victim = await register(throttled);
      const email = victim.payload.email;
      for (let i = 0; i < 3; i++) {
        const ip = { "x-forwarded-for": `203.0.113.${i}` };
        expect((await login(throttled, { email, password: `guess-${i}` }, ip)).statusCode).toBe(401);
      }
      // Even the right password waits now, so guessing can't continue.
      const blocked = await login(throttled, { email, password: TEST_PASSWORD });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json().code).toBe("ACCOUNT_THROTTLED");

      // Unknown emails behave the same, so the throttle doesn't reveal who has an account.
      const ghost = uniqueEmail("ghost");
      for (let i = 0; i < 3; i++) await login(throttled, { email: ghost, password: "nope-nope" });
      expect((await login(throttled, { email: ghost, password: "nope-nope" })).json().code).toBe("ACCOUNT_THROTTLED");

      // Other accounts are unaffected.
      const other = await register(throttled);
      expect((await login(throttled, { email: other.payload.email, password: TEST_PASSWORD })).statusCode).toBe(200);
    } finally {
      await throttled.close();
    }
  });

  it("never locks the shared demo login", async () => {
    const throttled = await makeApp({ limits: { login: 1000, loginFailures: 2 } });
    try {
      const demo = await sharedAccount();
      for (let i = 0; i < 5; i++) await login(throttled, { email: demo.payload.email, password: "vandal" });
      expect((await login(throttled, { email: demo.payload.email, password: TEST_PASSWORD })).statusCode).toBe(200);
    } finally {
      await throttled.close();
    }
  });

  it("forgets failures once the window passes", () => {
    const throttle = new FailureThrottle(2, 1000, 3);
    throttle.fail("a", 0);
    throttle.fail("a", 10);
    expect(throttle.blockedFor("a", 20)).toBe(980);
    expect(throttle.blockedFor("a", 1000)).toBe(0);
    throttle.fail("a", 1001);
    expect(throttle.blockedFor("a", 1002)).toBe(0);
    // Bounded memory: a flood of distinct keys evicts instead of growing.
    for (const key of ["b", "c", "d", "e", "f"]) throttle.fail(key, 1003);
    expect((throttle as unknown as { entries: Map<string, unknown> }).entries.size).toBeLessThanOrEqual(3);
  });
});

describe("shared demo account", () => {
  it("is flagged and can't change anything that affects other visitors", async () => {
    const demo = await sharedAccount();
    const auth = cookieFor(demo.token);
    expect((await me(demo.token)).json().shared).toBe(true);

    const attempts = [
      { method: "PATCH", url: "/auth/me", payload: { displayName: "pwned" } },
      { method: "POST", url: "/auth/password", payload: { currentPassword: TEST_PASSWORD, newPassword: "taken-over-42" } },
      { method: "POST", url: "/auth/2fa/setup" },
      { method: "POST", url: "/auth/2fa/enable", payload: { code: "123456" } },
      { method: "POST", url: "/auth/break", payload: { duration: "30d" } },
      { method: "POST", url: "/auth/sessions/revoke-others" },
      { method: "DELETE", url: "/auth/me", payload: { password: TEST_PASSWORD } },
      { method: "PUT", url: "/wallet/limits", payload: { depositLimitCents: 1000 } },
    ] as const;
    for (const attempt of attempts) {
      const res = await app.inject({ ...attempt, headers: auth });
      expect(res.statusCode, `${attempt.method} ${attempt.url}`).toBe(403);
      expect(res.json().code).toBe("SHARED_ACCOUNT");
    }

    // The account still works, with its original password.
    expect((await login(app, { email: demo.payload.email, password: TEST_PASSWORD })).statusCode).toBe(200);
    // Playing with fake money and chatting are fine.
    expect((await app.inject({ method: "POST", url: "/wallet/topup", headers: auth, payload: { amountCents: 5000 } })).statusCode).toBe(201);
    expect((await app.inject({ method: "POST", url: "/chat/en", headers: auth, payload: { body: "hello from the demo" } })).statusCode).toBe(201);
  });

  it("doesn't show one visitor the other visitors' sessions or let them kick each other out", async () => {
    const demo = await sharedAccount();
    const other = await login(app, { email: demo.payload.email, password: TEST_PASSWORD });
    const otherSid = decode(sessionToken(other)).sid;

    const list = await app.inject({ method: "GET", url: "/auth/sessions", headers: cookieFor(demo.token) });
    expect(list.json().sessions).toHaveLength(1);
    expect(list.json().sessions[0].current).toBe(true);

    const kick = await app.inject({ method: "DELETE", url: `/auth/sessions/${otherSid}`, headers: cookieFor(demo.token) });
    expect(kick.statusCode).toBe(403);
    expect((await me(sessionToken(other))).statusCode).toBe(200);

    // Signing yourself out is still allowed.
    const ownSid = decode(demo.token).sid;
    expect((await app.inject({ method: "DELETE", url: `/auth/sessions/${ownSid}`, headers: cookieFor(demo.token) })).statusCode).toBe(204);
  });
});

describe("suspended accounts", () => {
  it("are signed out, refused sign-in, and hidden from referral lists", async () => {
    const referrer = await register(app);
    const troll = await register(app, { displayName: "Troll", referralCode: referrer.user.referralCode });
    await app.prisma.user.update({ where: { id: troll.user.id }, data: { bannedAt: new Date() } });

    expect((await me(troll.token)).statusCode).toBe(401);
    const again = await login(app, { email: troll.payload.email, password: TEST_PASSWORD });
    expect(again.statusCode).toBe(403);
    expect(again.json().code).toBe("BANNED");

    const referrals = (await app.inject({ method: "GET", url: "/referrals", headers: cookieFor(referrer.token) })).json();
    expect(referrals.invited).toHaveLength(0);
    expect(referrals.invitedCount).toBe(0);
    expect((await app.inject({ method: "GET", url: `/referrals/lookup/${troll.user.referralCode}` })).statusCode).toBe(404);
  });

  it("can be handled from the operator CLI", async () => {
    const troll = await register(app, { displayName: "Spammer" });
    await app.inject({ method: "POST", url: "/chat/en", headers: cookieFor(troll.token), payload: { body: "buy my stuff please" } });

    const apiDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const out = execFileSync("npx", ["tsx", "src/cli/admin.ts", "ban", troll.payload.email.toUpperCase()], {
      cwd: apiDir,
      env: process.env,
      encoding: "utf8",
    });
    expect(out).toContain("1 chat message(s) deleted");
    expect(await app.prisma.chatMessage.count({ where: { userId: troll.user.id } })).toBe(0);
    expect((await me(troll.token)).statusCode).toBe(401);
    expect((await login(app, { email: troll.payload.email, password: TEST_PASSWORD })).json().code).toBe("BANNED");
  }, 30_000);
});

describe("kill switches", () => {
  it("close sign-ups and chat without a code change", async () => {
    const closed = await makeApp({ features: { registration: false, chat: false } });
    try {
      expect((await closed.inject({ method: "GET", url: "/config" })).json()).toEqual({ registrationOpen: false, chatOpen: false });

      const signup = await register(closed);
      expect(signup.res.statusCode).toBe(403);
      expect(signup.body.code).toBe("REGISTRATION_CLOSED");

      const { token } = await register(app);
      const post = await closed.inject({ method: "POST", url: "/chat/en", headers: cookieFor(token), payload: { body: "anyone here?" } });
      expect(post.statusCode).toBe(403);
      expect(post.json().code).toBe("CHAT_CLOSED");
      expect((await closed.inject({ method: "GET", url: "/chat/en", headers: cookieFor(token) })).json().open).toBe(false);
    } finally {
      await closed.close();
    }
    expect((await app.inject({ method: "GET", url: "/config" })).json()).toEqual({ registrationOpen: true, chatOpen: true });
  });
});

describe("fake balance cap", () => {
  it("stops top-ups and referral bonuses from overflowing the balance", async () => {
    const whale = await register(app);
    await app.prisma.user.update({ where: { id: whale.user.id }, data: { balanceCents: MAX_BALANCE_CENTS - 100 } });

    const topup = await app.inject({ method: "POST", url: "/wallet/topup", headers: cookieFor(whale.token), payload: { amountCents: 101 } });
    expect(topup.statusCode).toBe(400);
    expect(topup.json().code).toBe("BALANCE_CAP");
    expect((await app.inject({ method: "POST", url: "/wallet/topup", headers: cookieFor(whale.token), payload: { amountCents: 100 } })).statusCode).toBe(201);

    // The friend still joins; the capped referrer just doesn't get paid.
    const friend = await register(app, { referralCode: whale.user.referralCode });
    expect(friend.res.statusCode).toBe(201);
    expect((await me(whale.token)).json().balanceCents).toBe(MAX_BALANCE_CENTS);
  });
});

describe("chat retention", () => {
  it("drops messages older than a week when new ones arrive", async () => {
    const { token, user } = await register(app);
    const old = await app.prisma.chatMessage.create({
      data: { room: "pl", userId: user.id, body: "stara wiadomość", createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    });
    await app.inject({ method: "POST", url: "/chat/pl", headers: cookieFor(token), payload: { body: "nowa wiadomość" } });
    expect(await app.prisma.chatMessage.findUnique({ where: { id: old.id } })).toBeNull();
  });
});

describe("production start-up guard", () => {
  it("refuses to run with the public default or a short JWT secret", () => {
    const apiDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    for (const secret of ["", "change-me-in-real-life-this-is-a-demo", "too-short"]) {
      let stderr = "";
      try {
        execFileSync("npx", ["tsx", "src/index.ts"], {
          cwd: apiDir,
          env: { ...process.env, NODE_ENV: "production", JWT_SECRET: secret, PORT: "0" },
          encoding: "utf8",
          stdio: "pipe",
          timeout: 20_000,
        });
      } catch (err) {
        stderr = String((err as { stderr?: string }).stderr);
      }
      expect(stderr, `JWT_SECRET="${secret}"`).toContain("Refusing to start");
    }
  }, 60_000);
});

describe("session cookie", () => {
  it("is the only way in: no token in bodies, no bearer header accepted", async () => {
    const account = await register(app);
    expect(JSON.stringify(account.body)).not.toContain(account.token);
    const viaHeader = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${account.token}` } });
    expect(viaHeader.statusCode).toBe(401);
    expect((await me(account.token)).statusCode).toBe(200);
  });

  it("is Secure with the __Host- prefix on an HTTPS site, where a planted plain cookie is ignored", async () => {
    const https = await makeApp({ limits: { register: 1000 }, secureCookies: true });
    try {
      const res = await https.inject({
        method: "POST",
        url: "/auth/register",
        payload: { email: uniqueEmail("tls"), password: TEST_PASSWORD, displayName: "Tls User" },
      });
      const cookie = res.cookies.find((c) => c.name === "__Host-ns_session");
      expect(cookie).toMatchObject({ secure: true, httpOnly: true, sameSite: "Strict", path: "/" });
      expect(cookie?.domain).toBeUndefined();

      const token = cookie!.value;
      expect((await https.inject({ method: "GET", url: "/auth/me", headers: { cookie: `__Host-ns_session=${token}` } })).statusCode).toBe(200);
      expect((await https.inject({ method: "GET", url: "/auth/me", headers: { cookie: `ns_session=${token}` } })).statusCode).toBe(401);
    } finally {
      await https.close();
    }
  });

  it("doesn't let forwarded headers decide cookie security", async () => {
    const plain = await makeApp({ limits: { register: 1000 }, trustProxy: trustProxySetting("1") });
    try {
      const res = await plain.inject({
        method: "POST",
        url: "/auth/register",
        headers: { "x-forwarded-proto": "https" },
        payload: { email: uniqueEmail("hdr"), password: TEST_PASSWORD, displayName: "Header User" },
      });
      expect(res.cookies.map((c) => c.name)).toContain("ns_session");
      expect(res.cookies.map((c) => c.name)).not.toContain("__Host-ns_session");
    } finally {
      await plain.close();
    }
  });

  it("reports the session without erroring, and clears dead cookies", async () => {
    expect((await app.inject({ method: "GET", url: "/auth/session" })).json()).toEqual({ user: null });

    const account = await register(app);
    const live = await app.inject({ method: "GET", url: "/auth/session", headers: cookieFor(account.token) });
    expect(live.json().user.id).toBe(account.user.id);

    const forged = await app.inject({ method: "GET", url: "/auth/session", headers: cookieFor("not-a-jwt") });
    expect(forged.statusCode).toBe(200);
    expect(forged.json()).toEqual({ user: null });
    expect(forged.cookies.find((c) => c.name === "ns_session")?.value).toBe("");
  });

  it("is cleared on logout and stops working", async () => {
    const account = await register(app);
    const out = await app.inject({ method: "POST", url: "/auth/logout", headers: cookieFor(account.token) });
    expect(out.statusCode).toBe(204);
    expect(out.cookies.find((c) => c.name === "ns_session")?.value).toBe("");
    expect((await me(account.token)).statusCode).toBe(401);
  });
});

describe("cross-site requests (CSRF)", () => {
  it("refuses state changes a browser marks as coming from another site", async () => {
    const { token } = await register(app);
    const attempt = (headers: Record<string, string>) =>
      app.inject({ method: "POST", url: "/wallet/topup", headers: { ...cookieFor(token), ...headers }, payload: { amountCents: 100 } });

    const crossSite: Record<string, string>[] = [
      { origin: "https://evil.example" },
      { origin: "null" },
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
    ];
    for (const headers of crossSite) {
      const res = await attempt(headers);
      expect(res.statusCode, JSON.stringify(headers)).toBe(403);
      expect(res.json().code).toBe("FORBIDDEN_ORIGIN");
    }
    expect((await attempt({ origin: "http://localhost:5173", "sec-fetch-site": "same-origin" })).statusCode).toBe(201);
    // Reads stay open to any origin; without CORS headers other sites can't see the answer anyway.
    const read = await app.inject({ method: "GET", url: "/games", headers: { origin: "https://evil.example" } });
    expect(read.statusCode).toBe(200);
    expect(read.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("error contract", () => {
  it("answers every failure with a stable code (and the field for validation)", async () => {
    const bad = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "x@y.test", password: "short", displayName: "Ok Name" } });
    expect(bad.json()).toMatchObject({ code: "PASSWORD_TOO_SHORT", field: "password", error: "Password must be at least 8 characters" });

    const malformed = await app.inject({ method: "POST", url: "/auth/login", headers: { "content-type": "application/json" }, payload: "{not json" });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json().code).toBe("INVALID_INPUT");
  });

  it("refuses unknown profile fields instead of silently accepting them", async () => {
    const { token } = await register(app);
    for (const payload of [{ shared: false }, { balanceCents: 999_999_999 }, { displayName: "Fine Name", email: "x@y.test" }]) {
      const res = await app.inject({ method: "PATCH", url: "/auth/me", headers: cookieFor(token), payload });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
    }
    const avatar = await app.inject({ method: "PATCH", url: "/auth/me", headers: cookieFor(token), payload: { avatar: "skull-hacker" } });
    expect(avatar.json().code).toBe("AVATAR_INVALID");
  });
});

describe("password hashing under a flood", () => {
  it("answers SERVER_BUSY instead of queueing without bound", async () => {
    const flooded = await makeApp({ limits: { login: 10_000, global: 10_000, loginFailures: 10_000 } });
    try {
      const results = await Promise.all(
        Array.from({ length: 90 }, (_, i) => login(flooded, { email: `flood-${i}@test.local`, password: "whatever-123" }))
      );
      const codes = results.map((r) => r.json().code);
      expect(codes).toContain("SERVER_BUSY");
      expect(codes).toContain("INVALID_CREDENTIALS");
      expect(results.find((r) => r.json().code === "SERVER_BUSY")?.statusCode).toBe(503);
    } finally {
      await flooded.close();
    }
  }, 60_000);
});

describe("races", () => {
  it("parallel top-ups can't slip past the daily deposit limit together", async () => {
    const { token, user } = await register(app);
    await app.prisma.user.update({ where: { id: user.id }, data: { depositLimitCents: 1_000 } });
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        app.inject({ method: "POST", url: "/wallet/topup", headers: cookieFor(token), payload: { amountCents: 600 } })
      )
    );
    expect(results.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(results.filter((r) => r.json().code === "DEPOSIT_LIMIT")).toHaveLength(5);
  });
});

describe("chat text tricks", () => {
  it("strips invisible and direction-flipping characters and flattens zalgo", async () => {
    const { token } = await register(app);
    const send = (body: string) => app.inject({ method: "POST", url: "/chat/en", headers: cookieFor(token), payload: { body } });
    expect((await send("pay‮usd​ now")).json().message.body).toBe("pay usd now");
    expect((await send("ź̂̃̄̅a")).json().message.body).toBe("ź̂a");
    expect((await send("​‍⁠")).json().code).toBe("CHAT_EMPTY");
  });
});

describe("impersonation", () => {
  it("normalises look-alike characters and refuses other scripts in usernames", async () => {
    const cases: [string, string][] = [
      ["\u0410dmin", "USERNAME_CHARACTERS"], // Cyrillic А
      ["\uff53upport", "USERNAME_RESERVED"], // fullwidth ｓ folds to "support"
      ["Ad\u0336min", "USERNAME_CHARACTERS"], // combining overlay
      ["\u03a1aul", "USERNAME_CHARACTERS"], // Greek Ρ
    ];
    for (const [displayName, code] of cases) {
      const { res } = await register(app, { displayName });
      expect(res.json().code, JSON.stringify(displayName)).toBe(code);
    }
    const polish = await register(app, { displayName: "Zażółć Gęślą" });
    expect(polish.res.statusCode).toBe(201);
    expect(polish.user.displayName).toBe("Zażółć Gęślą");
  });

  it("keeps the published demo accounts' names for them alone", async () => {
    const demo = await sharedAccount();
    const lookalike = demo.user.displayName.toUpperCase().replace(/ /g, ".");
    expect((await register(app, { displayName: lookalike })).res.json().code).toBe("USERNAME_RESERVED");

    const { token } = await register(app);
    const rename = await app.inject({ method: "PATCH", url: "/auth/me", headers: cookieFor(token), payload: { displayName: demo.user.displayName } });
    expect(rename.json().code).toBe("USERNAME_RESERVED");
  });
});

describe("lockout griefing", () => {
  it("lets the owner's browser past the per-account throttle an attacker tripped", async () => {
    const throttled = await makeApp({ limits: { login: 1000, register: 1000, loginFailures: 3 } });
    try {
      const owner = await register(throttled);
      const device = owner.res.cookies.find((c) => c.name === "ns_device");
      expect(device).toMatchObject({ httpOnly: true, sameSite: "Strict" });

      const creds = { email: owner.payload.email, password: TEST_PASSWORD };
      for (let i = 0; i < 3; i++) await login(throttled, { ...creds, password: `attacker-guess-${i}` });
      expect((await login(throttled, creds)).json().code).toBe("ACCOUNT_THROTTLED");

      const fromOwnersBrowser = await login(throttled, creds, { cookie: `ns_device=${device!.value}` });
      expect(fromOwnersBrowser.statusCode).toBe(200);

      // A forged or someone else's device cookie doesn't help.
      for (let i = 0; i < 3; i++) await login(throttled, { ...creds, password: `attacker-guess-${i}` });
      const forged = `${owner.user.id}.9999999999.${"A".repeat(43)}`;
      expect((await login(throttled, creds, { cookie: `ns_device=${forged}` })).json().code).toBe("ACCOUNT_THROTTLED");
      const other = await register(throttled);
      const otherDevice = other.res.cookies.find((c) => c.name === "ns_device")!.value;
      expect((await login(throttled, creds, { cookie: `ns_device=${otherDevice}` })).json().code).toBe("ACCOUNT_THROTTLED");
    } finally {
      await throttled.close();
    }
  });

  it("can't have a blocked account's counter flushed out by junk keys", () => {
    const throttle = new FailureThrottle(2, 60_000, 4);
    throttle.fail("victim", 0);
    throttle.fail("victim", 1);
    for (let i = 0; i < 20; i++) throttle.fail(`junk-${i}`, 2);
    expect(throttle.blockedFor("victim", 3)).toBeGreaterThan(0);
  });
});

describe("shared demo balance", () => {
  it("starts over instead of locking everyone out when a visitor fills it to the cap", async () => {
    const demo = await sharedAccount();
    await app.prisma.user.update({ where: { id: demo.user.id }, data: { balanceCents: MAX_BALANCE_CENTS - 10 } });
    const res = await app.inject({ method: "POST", url: "/wallet/topup", headers: cookieFor(demo.token), payload: { amountCents: 5_000 } });
    expect(res.statusCode).toBe(201);
    expect(res.json().balanceCents).toBe(5_000_000 + 5_000);
  });
});
