import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, makeApp, register } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => (app = await makeApp()));
afterAll(async () => app.close());

const topup = (token: string, amountCents: number) =>
  app.inject({ method: "POST", url: "/wallet/topup", headers: bearer(token), payload: { amountCents, method: "crypto_btc" } });
const setLimit = (token: string, depositLimitCents: number | null) =>
  app.inject({ method: "PUT", url: "/wallet/limits", headers: bearer(token), payload: { depositLimitCents } });

describe("wallet", () => {
  it("requires auth", async () => {
    expect((await app.inject({ method: "GET", url: "/wallet" })).statusCode).toBe(401);
  });

  it("credits a demo top-up and records it", async () => {
    const { token } = await register(app);
    const res = await topup(token, 12_345);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ balanceCents: 1_012_345, depositedTodayCents: 12_345, depositLimitCents: null });

    const txs = (await app.inject({ method: "GET", url: "/wallet/transactions", headers: bearer(token) })).json().transactions;
    expect(txs[0]).toMatchObject({ type: "TOPUP", amountCents: 12_345, note: "Demo top-up via crypto_btc (simulated, no real payment)" });
    expect(txs.map((t: { type: string }) => t.type)).toContain("WELCOME_BONUS");
  });

  it("validates top-up amounts", async () => {
    const { token } = await register(app);
    expect((await topup(token, 0)).statusCode).toBe(400);
    expect((await topup(token, 1.5)).statusCode).toBe(400);
  });

  it("enforces the rolling 24h deposit limit", async () => {
    const { token } = await register(app);
    expect((await setLimit(token, 50_000)).json()).toMatchObject({ depositLimitCents: 50_000, depositedTodayCents: 0 });

    expect((await topup(token, 30_000)).statusCode).toBe(201);
    const over = await topup(token, 30_000);
    expect(over.statusCode).toBe(400);
    expect(over.json()).toMatchObject({ code: "DEPOSIT_LIMIT", remainingCents: 20_000 });
    expect((await topup(token, 20_000)).statusCode).toBe(201);

    // Removing the limit lifts the cap.
    expect((await setLimit(token, null)).json().depositLimitCents).toBeNull();
    expect((await topup(token, 100_000)).statusCode).toBe(201);
  });

  it("rejects limits below the $10 minimum", async () => {
    const { token } = await register(app);
    expect((await setLimit(token, 500)).statusCode).toBe(400);
  });
});

describe("games", () => {
  it("serves the catalog grouped by category and gates launches behind auth", async () => {
    await app.prisma.game.upsert({
      where: { slug: "test-slot" },
      update: {},
      create: {
        slug: "test-slot",
        title: "Test Slot",
        provider: "Test Studio",
        category: "Slots",
        thumbnailUrl: "/x.svg",
        launchPath: "/play/test_studio:test-slot",
      },
    });
    const list = (await app.inject({ method: "GET", url: "/games" })).json();
    expect(list.byCategory.Slots.map((g: { slug: string }) => g.slug)).toContain("test-slot");

    expect((await app.inject({ method: "GET", url: "/games/test-slot/launch" })).statusCode).toBe(401);
    const { token } = await register(app);
    const launch = await app.inject({ method: "GET", url: "/games/test-slot/launch", headers: bearer(token) });
    expect(launch.json()).toMatchObject({ game: { title: "Test Slot" }, launch: { mode: "demo" } });
    expect((await app.inject({ method: "GET", url: "/games/nope/launch", headers: bearer(token) })).statusCode).toBe(404);
  });
});
