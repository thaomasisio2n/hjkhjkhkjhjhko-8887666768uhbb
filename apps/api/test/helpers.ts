import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp, type AppOptions } from "../src/app.js";

let counter = 0;

export const TEST_PASSWORD = "spin-test-9431";

export async function makeApp(opts: AppOptions = {}) {
  const app = await buildApp({ logger: false, ...opts });
  await app.ready();
  return app;
}

export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}

/** The session token from a response's Set-Cookie (it's never in the body). */
export function sessionToken(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === "ns_session" || c.name === "__Host-ns_session");
  if (!cookie?.value) throw new Error(`no session cookie in response (${res.statusCode}: ${res.body})`);
  return cookie.value;
}

/** Headers that send a session the way a browser would. */
export const cookieFor = (token: string) => ({ cookie: `ns_session=${token}` });

export async function register(
  app: FastifyInstance,
  overrides: { email?: string; password?: string; displayName?: string; referralCode?: string } = {}
) {
  const payload = {
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? TEST_PASSWORD,
    displayName: overrides.displayName ?? "Test Player",
    referralCode: overrides.referralCode,
  };
  const res = await app.inject({ method: "POST", url: "/auth/register", payload });
  const body = res.json();
  const token = res.statusCode === 201 ? sessionToken(res) : "";
  return { res, body, token, user: body.user, payload };
}
