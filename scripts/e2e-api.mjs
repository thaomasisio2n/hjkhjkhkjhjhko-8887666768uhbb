#!/usr/bin/env node
// Starts the API for Playwright on its own port with a freshly migrated and
// seeded database, so e2e runs never touch (or depend on) your dev data.
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWin = process.platform === "win32";
const npx = isWin ? "npx.cmd" : "npx";
const apiDir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "apps/api");

const env = {
  ...process.env,
  DATABASE_URL: "file:./e2e.db",
  PORT: process.env.E2E_API_PORT ?? "8788",
  WEB_ORIGIN: process.env.E2E_WEB_ORIGIN ?? "http://localhost:5174",
  JWT_SECRET: "e2e-secret",
  RATE_LIMIT_SCALE: "100",
};

for (const suffix of ["", "-journal"]) rmSync(path.join(apiDir, "prisma", `e2e.db${suffix}`), { force: true });
for (const args of [["prisma", "migrate", "deploy"], ["prisma", "db", "seed"]]) {
  const r = spawnSync(npx, args, { cwd: apiDir, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const api = spawn(npx, ["tsx", "src/index.ts"], { cwd: apiDir, env, stdio: "inherit" });
const stop = () => api.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
api.on("exit", (code) => process.exit(code ?? 0));
