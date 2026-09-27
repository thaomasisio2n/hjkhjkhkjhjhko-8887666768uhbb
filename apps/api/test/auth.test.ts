import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, makeApp, register, uniqueEmail } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => (app = await makeApp()));
afterAll(async () => app.close());

describe("auth", () => {
  it("registers with a welcome balance and never leaks the password hash", async () => {
    const { res, body } = await register(app, { displayName: "Alice" });
    expect(res.statusCode).toBe(201);
    expect(body.token).toBeTypeOf("string");
    expect(body.user).toMatchObject({ displayName: "Alice", balanceCents: 1_000_000, avatar: null });
    expect(body.user.referralCode).toMatch(/^[A-Z0-9_-]{8}$/);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("rejects a duplicate email", async () => {
    const email = uniqueEmail();
    await register(app, { email });
    const { res } = await register(app, { email });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Email already registered");
  });

  it("validates the payload", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email: "nope", password: "x" } });
    expect(res.statusCode).toBe(400);
  });

  it("logs in with the right password only", async () => {
    const { payload } = await register(app);
    const ok = await app.inject({ method: "POST", url: "/auth/login", payload: { email: payload.email, password: payload.password } });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({ method: "POST", url: "/auth/login", payload: { email: payload.email, password: "wrong-password" } });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error).toBe("Invalid credentials");
  });

  it("protects /auth/me", async () => {
    expect((await app.inject({ method: "GET", url: "/auth/me" })).statusCode).toBe(401);
    const { token } = await register(app, { displayName: "Me" });
    const me = await app.inject({ method: "GET", url: "/auth/me", headers: bearer(token) });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ displayName: "Me" });
    expect(me.json().createdAt).toBeTruthy();
  });
});

describe("profile", () => {
  it("updates the display name and avatar", async () => {
    const { token } = await register(app);
    const res = await app.inject({
      method: "PATCH",
      url: "/auth/me",
      headers: bearer(token),
      payload: { displayName: "  Renamed  ", avatar: "crown-crimson" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ displayName: "Renamed", avatar: "crown-crimson" });

    const cleared = await app.inject({ method: "PATCH", url: "/auth/me", headers: bearer(token), payload: { avatar: null } });
    expect(cleared.json().avatar).toBeNull();
  });

  it("rejects malformed avatars and empty updates", async () => {
    const { token } = await register(app);
    const bad = await app.inject({ method: "PATCH", url: "/auth/me", headers: bearer(token), payload: { avatar: "<script>" } });
    expect(bad.statusCode).toBe(400);
    const empty = await app.inject({ method: "PATCH", url: "/auth/me", headers: bearer(token), payload: {} });
    expect(empty.statusCode).toBe(400);
  });
});

describe("password change", () => {
  it("requires the current password and swaps credentials", async () => {
    const { token, payload } = await register(app);
    const wrong = await app.inject({
      method: "POST",
      url: "/auth/password",
      headers: bearer(token),
      payload: { currentPassword: "not-it", newPassword: "brand-new-pass" },
    });
    expect(wrong.statusCode).toBe(400);
    expect(wrong.json().error).toBe("Current password is incorrect");

    const same = await app.inject({
      method: "POST",
      url: "/auth/password",
      headers: bearer(token),
      payload: { currentPassword: payload.password, newPassword: payload.password },
    });
    expect(same.statusCode).toBe(400);

    const ok = await app.inject({
      method: "POST",
      url: "/auth/password",
      headers: bearer(token),
      payload: { currentPassword: payload.password, newPassword: "brand-new-pass" },
    });
    expect(ok.statusCode).toBe(200);

    const login = (password: string) =>
      app.inject({ method: "POST", url: "/auth/login", payload: { email: payload.email, password } });
    expect((await login(payload.password)).statusCode).toBe(401);
    expect((await login("brand-new-pass")).statusCode).toBe(200);
  });
});

describe("rate limiting", () => {
  it("throttles repeated login attempts per IP", async () => {
    const limited = await makeApp({ limits: { login: 3 } });
    try {
      const attempt = () =>
        limited.inject({ method: "POST", url: "/auth/login", payload: { email: "nobody@test.local", password: "x" } });
      for (let i = 0; i < 3; i++) expect((await attempt()).statusCode).toBe(401);
      const blocked = await attempt();
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json().error).toBe("Too many attempts — try again in a minute.");
    } finally {
      await limited.close();
    }
  });
});
