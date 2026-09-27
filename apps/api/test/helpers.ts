import type { FastifyInstance } from "fastify";
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
  return { res, body, token: body.token as string, user: body.user, payload };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
