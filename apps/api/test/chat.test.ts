import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { moderateMessage } from "../src/lib/moderation.js";
import { cookieFor, makeApp, register } from "./helpers.js";

let app: FastifyInstance;
beforeAll(async () => (app = await makeApp()));
afterAll(async () => app.close());

const post = (token: string, body: string, room = "en") =>
  app.inject({ method: "POST", url: `/chat/${room}`, headers: cookieFor(token), payload: { body } });
const list = (token: string, query = "", room = "en") =>
  app.inject({ method: "GET", url: `/chat/${room}${query}`, headers: cookieFor(token) });

describe("chat moderation rules", () => {
  it("cleans whitespace and control characters", () => {
    expect(moderateMessage("  hello \n\n  there\u0007 ")).toEqual({ ok: true, body: "hello there" });
  });

  it("rejects empty, shouting and link shorteners", () => {
    expect(moderateMessage("   ").ok).toBe(false);
    expect(moderateMessage("THIS IS SO LOUD").ok).toBe(false);
    expect(moderateMessage("OK, fine").ok).toBe(true);
    expect(moderateMessage("look https://bit.ly/abc").ok).toBe(false);
    expect(moderateMessage("docs at https://example.com/page").ok).toBe(true);
  });
});

describe("chat", () => {
  it("requires auth and a known room", async () => {
    expect((await app.inject({ method: "GET", url: "/chat/en" })).statusCode).toBe(401);
    const { token } = await register(app);
    expect((await list(token, "", "de")).statusCode).toBe(404);
  });

  it("posts and polls messages per room", async () => {
    const alice = await register(app, { displayName: "Alice" });
    const bob = await register(app, { displayName: "Bob" });

    const sent = await post(alice.token, "hi bob", "pl");
    expect(sent.statusCode).toBe(201);
    const message = sent.json().message;
    expect(message).toMatchObject({ body: "hi bob", room: "pl", mine: true, user: { displayName: "Alice" } });

    const seen = (await list(bob.token, "", "pl")).json().messages;
    expect(seen.at(-1)).toMatchObject({ id: message.id, mine: false, user: { displayName: "Alice" } });

    const after = encodeURIComponent(new Date(message.createdAt).toISOString());
    expect((await list(bob.token, `?after=${after}`, "pl")).json().messages).toEqual([]);
    await post(bob.token, "hey alice", "pl");
    const fresh = (await list(alice.token, `?after=${after}`, "pl")).json().messages;
    expect(fresh.map((m: { body: string }) => m.body)).toEqual(["hey alice"]);

    // Rooms are separate.
    expect((await list(bob.token, "", "en")).json().messages.some((m: { id: string }) => m.id === message.id)).toBe(false);
  });

  it("enforces the rules server-side", async () => {
    const { token } = await register(app);
    expect((await post(token, "NOBODY LISTENS TO ME")).json().error).toMatch(/shout/);
    expect((await post(token, "x".repeat(241))).statusCode).toBe(400);
    expect((await post(token, "same thing twice")).statusCode).toBe(201);
    expect((await post(token, "same thing twice")).json().error).toMatch(/repeat/);
  });

  it("hides ghost-mode players from others but not from themselves", async () => {
    const ghost = await register(app, { displayName: "Casper" });
    const viewer = await register(app);
    await app.inject({ method: "PATCH", url: "/auth/me", headers: cookieFor(ghost.token), payload: { ghostMode: true } });
    const id = (await post(ghost.token, "boo")).json().message.id;

    const forViewer = (await list(viewer.token)).json().messages.find((m: { id: string }) => m.id === id);
    expect(forViewer.user).toBeNull();
    const forGhost = (await list(ghost.token)).json().messages.find((m: { id: string }) => m.id === id);
    expect(forGhost).toMatchObject({ mine: true, user: { displayName: "Casper" } });
  });

  it("rate-limits posting", async () => {
    const limited = await makeApp({ limits: { chat: 2 } });
    try {
      const { token } = await register(limited);
      const send = (body: string) =>
        limited.inject({ method: "POST", url: "/chat/en", headers: cookieFor(token), payload: { body } });
      expect((await send("one")).statusCode).toBe(201);
      expect((await send("two")).statusCode).toBe(201);
      expect((await send("three")).statusCode).toBe(429);
    } finally {
      await limited.close();
    }
  });
});
