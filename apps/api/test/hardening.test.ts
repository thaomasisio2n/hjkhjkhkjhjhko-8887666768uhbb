import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { MAX_BALANCE_CENTS, trustProxySetting } from "../src/config.js";
import { FailureThrottle } from "../src/lib/throttle.js";
import { TEST_PASSWORD, bearer, makeApp, register, uniqueEmail } from "./helpers.js";

let app: FastifyInstance;
// Plenty of sign-ups per "IP" here; the limits themselves are tested separately.
beforeAll(async () => (app = await makeApp({ limits: { register: 1000 } })));
afterAll(async () => app.close());

const login = (a: FastifyInstance, payload: Record<string, string>, headers: Record<string, string> = {}) =>
  a.inject({ method: "POST", url: "/auth/login", payload, headers });
const me = (token: string) => app.inject({ method: "GET", url: "/auth/me", headers: bearer(token) });

// Hand-rolled JWTs, to check the API rejects tokens it didn't issue.
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
function craftToken(payload: object, { alg = "HS256", secret = "test-secret" } = {}) {
  const head = `${b64url({ alg, typ: "JWT" })}.${b64url(payload)}`;
  if (alg === "none") return `${head}.`;
  return `${head}.${createHmac("sha256", secret).update(head).digest("base64url")}`;
}
const decode = (token: string) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

async function sharedAccount() {
  const account = await register(app);
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
      expect(missing.json()).toEqual({ error: "Not found" });
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
      headers: bearer(token),
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
    const auth = bearer(demo.token);
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
    const otherSid = decode(other.json().token).sid;

    const list = await app.inject({ method: "GET", url: "/auth/sessions", headers: bearer(demo.token) });
    expect(list.json().sessions).toHaveLength(1);
    expect(list.json().sessions[0].current).toBe(true);

    const kick = await app.inject({ method: "DELETE", url: `/auth/sessions/${otherSid}`, headers: bearer(demo.token) });
    expect(kick.statusCode).toBe(403);
    expect((await me(other.json().token)).statusCode).toBe(200);

    // Signing yourself out is still allowed.
    const ownSid = decode(demo.token).sid;
    expect((await app.inject({ method: "DELETE", url: `/auth/sessions/${ownSid}`, headers: bearer(demo.token) })).statusCode).toBe(204);
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

    const referrals = (await app.inject({ method: "GET", url: "/referrals", headers: bearer(referrer.token) })).json();
    expect(referrals.invited).toHaveLength(0);
    expect(referrals.invitedCount).toBe(0);
    expect((await app.inject({ method: "GET", url: `/referrals/lookup/${troll.user.referralCode}` })).statusCode).toBe(404);
  });

  it("can be handled from the operator CLI", async () => {
    const troll = await register(app, { displayName: "Spammer" });
    await app.inject({ method: "POST", url: "/chat/en", headers: bearer(troll.token), payload: { body: "buy my stuff please" } });

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
      const post = await closed.inject({ method: "POST", url: "/chat/en", headers: bearer(token), payload: { body: "anyone here?" } });
      expect(post.statusCode).toBe(403);
      expect(post.json().code).toBe("CHAT_CLOSED");
      expect((await closed.inject({ method: "GET", url: "/chat/en", headers: bearer(token) })).json().open).toBe(false);
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

    const topup = await app.inject({ method: "POST", url: "/wallet/topup", headers: bearer(whale.token), payload: { amountCents: 101 } });
    expect(topup.statusCode).toBe(400);
    expect(topup.json().code).toBe("BALANCE_CAP");
    expect((await app.inject({ method: "POST", url: "/wallet/topup", headers: bearer(whale.token), payload: { amountCents: 100 } })).statusCode).toBe(201);

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
    await app.inject({ method: "POST", url: "/chat/pl", headers: bearer(token), payload: { body: "nowa wiadomość" } });
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
