import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { base32Decode, base32Encode, totp, verifyTotp } from "../src/lib/totp.js";
import { bearer, makeApp, register } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => (app = await makeApp()));
afterAll(async () => app.close());

const me = (token: string) => app.inject({ method: "GET", url: "/auth/me", headers: bearer(token) });
const login = (payload: Record<string, string>) => app.inject({ method: "POST", url: "/auth/login", payload });

describe("TOTP (RFC 6238)", () => {
  // RFC 6238 appendix B uses the ASCII secret "12345678901234567890".
  const secret = base32Encode(Buffer.from("12345678901234567890"));

  it("round-trips base32", () => {
    expect(secret).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(secret).toString()).toBe("12345678901234567890");
  });

  it("matches the published SHA-1 test vectors", () => {
    expect(totp(secret, 59_000, 30, 8)).toBe("94287082");
    expect(totp(secret, 1_111_111_109_000, 30, 8)).toBe("07081804");
    expect(totp(secret, 2_000_000_000_000, 30, 8)).toBe("69279037");
    expect(totp(secret, 59_000)).toBe("287082");
  });

  it("accepts one step of clock drift and nothing more", () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now + 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totp(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, "12345", now)).toBe(false);
  });
});

describe("sessions", () => {
  it("lists, revokes others and logs out", async () => {
    const first = await register(app);
    const second = (await login({ email: first.payload.email, password: first.payload.password })).json().token;

    const list = (await app.inject({ method: "GET", url: "/auth/sessions", headers: bearer(second) })).json().sessions;
    expect(list).toHaveLength(2);
    expect(list.filter((s: { current: boolean }) => s.current)).toHaveLength(1);

    const revoked = await app.inject({ method: "POST", url: "/auth/sessions/revoke-others", headers: bearer(second) });
    expect(revoked.json()).toEqual({ revoked: 1 });
    expect((await me(first.token)).statusCode).toBe(401);
    expect((await me(second)).statusCode).toBe(200);

    expect((await app.inject({ method: "DELETE", url: "/auth/sessions/nope", headers: bearer(second) })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/auth/logout", headers: bearer(second) })).statusCode).toBe(204);
    expect((await me(second)).statusCode).toBe(401);
  });

  it("revokes one specific session", async () => {
    const first = await register(app);
    const second = (await login({ email: first.payload.email, password: first.payload.password })).json().token;
    const list = (await app.inject({ method: "GET", url: "/auth/sessions", headers: bearer(second) })).json().sessions;
    const other = list.find((s: { current: boolean }) => !s.current);
    const res = await app.inject({ method: "DELETE", url: `/auth/sessions/${other.id}`, headers: bearer(second) });
    expect(res.statusCode).toBe(204);
    expect((await me(first.token)).statusCode).toBe(401);
  });

  it("signs out other devices when the password changes", async () => {
    const first = await register(app);
    const second = (await login({ email: first.payload.email, password: first.payload.password })).json().token;
    const res = await app.inject({
      method: "POST",
      url: "/auth/password",
      headers: bearer(second),
      payload: { currentPassword: first.payload.password, newPassword: "another-password" },
    });
    expect(res.json()).toMatchObject({ ok: true, signedOut: 1 });
    expect((await me(first.token)).statusCode).toBe(401);
    expect((await me(second)).statusCode).toBe(200);
  });

  it("rejects tokens that aren't bound to a session", async () => {
    const { user } = await register(app);
    const legacy = app.jwt.sign({ sub: user.id } as { sub: string; sid: string });
    expect((await me(legacy)).statusCode).toBe(401);
  });
});

describe("two-factor auth", () => {
  it("sets up, enforces on login, and disables", async () => {
    const { token, payload } = await register(app);
    const setup = await app.inject({ method: "POST", url: "/auth/2fa/setup", headers: bearer(token) });
    const { secret, otpauthUrl, qrSvg } = setup.json();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(otpauthUrl).toContain(`secret=${secret}`);
    expect(qrSvg).toContain("<svg");

    const enable = (code: string) =>
      app.inject({ method: "POST", url: "/auth/2fa/enable", headers: bearer(token), payload: { code } });
    const wrong = await enable(totp(secret) === "000000" ? "111111" : "000000");
    expect(wrong.statusCode).toBe(400);
    expect((await enable(totp(secret))).json()).toEqual({ totpEnabled: true });
    expect((await me(token)).json().totpEnabled).toBe(true);

    const creds = { email: payload.email, password: payload.password };
    expect((await login(creds)).json()).toMatchObject({ code: "TOTP_REQUIRED" });
    expect((await login({ ...creds, code: "000000" === totp(secret) ? "111111" : "000000" })).json()).toMatchObject({
      code: "TOTP_INVALID",
    });
    expect((await login({ ...creds, code: totp(secret) })).statusCode).toBe(200);

    expect((await app.inject({ method: "POST", url: "/auth/2fa/setup", headers: bearer(token) })).statusCode).toBe(409);

    const disable = await app.inject({
      method: "POST",
      url: "/auth/2fa/disable",
      headers: bearer(token),
      payload: { code: totp(secret) },
    });
    expect(disable.json()).toEqual({ totpEnabled: false });
    expect((await login(creds)).statusCode).toBe(200);
  });
});

describe("break in play", () => {
  it("signs the player out and refuses sign-in until it ends", async () => {
    const { token, payload, user } = await register(app);
    expect((await app.inject({ method: "POST", url: "/auth/break", headers: bearer(token), payload: { duration: "2h" } })).statusCode).toBe(400);

    const res = await app.inject({ method: "POST", url: "/auth/break", headers: bearer(token), payload: { duration: "24h" } });
    const until = new Date(res.json().until).getTime();
    expect(until - Date.now()).toBeGreaterThan(23.9 * 3600_000);
    expect((await me(token)).statusCode).toBe(401);

    const blocked = await login({ email: payload.email, password: payload.password });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toMatchObject({ code: "ON_BREAK" });

    // Once the break has passed, signing in works again.
    await app.prisma.user.update({ where: { id: user.id }, data: { breakUntil: new Date(Date.now() - 1000) } });
    expect((await login({ email: payload.email, password: payload.password })).statusCode).toBe(200);
  });
});

describe("account deletion", () => {
  it("needs the password and keeps invited friends' accounts", async () => {
    const host = await register(app, { displayName: "Leaving" });
    const friend = await register(app, { referralCode: host.user.referralCode });
    await app.inject({ method: "POST", url: "/chat/en", headers: bearer(host.token), payload: { body: "bye everyone" } });

    const wrong = await app.inject({ method: "DELETE", url: "/auth/me", headers: bearer(host.token), payload: { password: "nope" } });
    expect(wrong.statusCode).toBe(400);

    const ok = await app.inject({ method: "DELETE", url: "/auth/me", headers: bearer(host.token), payload: { password: host.payload.password } });
    expect(ok.statusCode).toBe(204);
    expect((await login({ email: host.payload.email, password: host.payload.password })).statusCode).toBe(401);
    expect(await app.prisma.chatMessage.count({ where: { userId: host.user.id } })).toBe(0);

    const friendRow = await app.prisma.user.findUniqueOrThrow({ where: { id: friend.user.id } });
    expect(friendRow.referredById).toBeNull();
    expect((await me(friend.token)).statusCode).toBe(200);
  });
});
