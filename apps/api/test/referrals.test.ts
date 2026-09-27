import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, makeApp, register } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => (app = await makeApp()));
afterAll(async () => app.close());

describe("referrals", () => {
  it("builds the link from WEB_ORIGIN and reports bonus amounts", async () => {
    const { token, user } = await register(app);
    const res = await app.inject({ method: "GET", url: "/referrals", headers: bearer(token) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      referralCode: user.referralCode,
      referralLink: `http://localhost:5173/register?ref=${user.referralCode}`,
      invited: [],
      totalEarnedCents: 0,
      bonusPerReferralCents: 500_000,
      welcomeBonusCents: 1_000_000,
    });
  });

  it("looks codes up publicly and case-insensitively", async () => {
    const { user } = await register(app, { displayName: "Referrer" });
    const res = await app.inject({ method: "GET", url: `/referrals/lookup/${user.referralCode.toLowerCase()}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ code: user.referralCode, referrerName: "Referrer", welcomeBonusCents: 1_000_000 });
    expect((await app.inject({ method: "GET", url: "/referrals/lookup/NOPE0000" })).statusCode).toBe(404);
  });

  it("credits the referrer when a friend signs up with a lowercase code", async () => {
    const referrer = await register(app, { displayName: "Host" });
    const friend = await register(app, { displayName: "Friend", referralCode: ` ${referrer.user.referralCode.toLowerCase()} ` });
    expect(friend.res.statusCode).toBe(201);

    const res = await app.inject({ method: "GET", url: "/referrals", headers: bearer(referrer.token) });
    const body = res.json();
    expect(body.totalEarnedCents).toBe(500_000);
    expect(body.invited).toHaveLength(1);
    expect(body.invited[0]).toMatchObject({ displayName: "Friend", avatar: null });

    const wallet = await app.inject({ method: "GET", url: "/wallet", headers: bearer(referrer.token) });
    expect(wallet.json().balanceCents).toBe(1_000_000 + 500_000);
  });

  it("rejects unknown codes without creating the account", async () => {
    const { res, payload } = await register(app, { referralCode: "DOESNOTEXIST" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid referral code");
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: payload.email, password: payload.password } });
    expect(login.statusCode).toBe(401);
  });
});
