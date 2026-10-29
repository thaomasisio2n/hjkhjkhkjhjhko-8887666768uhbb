#!/usr/bin/env node
// One-command bootstrap for the demo: install deps, set up the local
// SQLite db, seed placeholder games, and start both dev servers.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWin = process.platform === "win32";
const npmBin = isWin ? "npm.cmd" : "npm";
const npxBin = isWin ? "npx.cmd" : "npx";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiDir = path.join(root, "apps/api");

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const YELLOW = "\x1b[33m";

function step(msg) {
  console.log(`\n${CYAN}${msg}${RESET}`);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...opts });
  if (result.status !== 0) {
    console.error(`\nCommand failed: ${cmd} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`${YELLOW}== NovaSpin demo: one-command setup ==${RESET}`);
console.log("Educational demo only — no real money, no real games, no real payments.\n");

step("[1/4] Installing dependencies (first run can take a minute)...");
run(npmBin, ["install"]);

// Every checkout gets its own random JWT secret; the old public default in
// existing .env files is replaced, since anyone could forge tokens with it.
const envPath = path.join(apiDir, ".env");
const envExamplePath = path.join(apiDir, ".env.example");
const OLD_DEFAULT_SECRET = "change-me-in-real-life-this-is-a-demo";
const withSecret = (env) =>
  env.replace(/^JWT_SECRET=.*$/m, (line) =>
    line === 'JWT_SECRET=""' || line.includes(OLD_DEFAULT_SECRET) ? `JWT_SECRET="${randomBytes(32).toString("hex")}"` : line
  );
if (!existsSync(envPath)) {
  step("[2/4] Creating apps/api/.env from the example (with a random JWT secret)...");
  writeFileSync(envPath, withSecret(readFileSync(envExamplePath, "utf8")));
} else {
  const env = readFileSync(envPath, "utf8");
  const updated = withSecret(env);
  if (updated !== env) writeFileSync(envPath, updated);
  step(`[2/4] apps/api/.env already exists, keeping it${updated !== env ? " (replaced the old public JWT secret)" : ""}.`);
}

step("[3/4] Setting up the database (migrate + seed placeholder games)...");
run(npxBin, ["prisma", "migrate", "deploy"], { cwd: apiDir });
run(npxBin, ["prisma", "generate"], { cwd: apiDir });
run(npxBin, ["prisma", "db", "seed"], { cwd: apiDir });

step("[4/4] Starting API (http://localhost:8787) and Web (http://localhost:5173)...");

function spawnLabeled(name, color, args) {
  const child = spawn(npmBin, args, { cwd: root, shell: isWin });
  const prefix = `${color}[${name}]${RESET} `;

  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        out.write(prefix + buf.slice(0, idx) + "\n");
        buf = buf.slice(idx + 1);
      }
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  return child;
}

const api = spawnLabeled("API", BLUE, ["run", "dev", "--workspace=apps/api"]);
const web = spawnLabeled("WEB", MAGENTA, ["run", "dev", "--workspace=apps/web"]);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  api.kill();
  web.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
api.on("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown();
});
web.on("exit", (code) => {
  if (!shuttingDown && code !== 0) shutdown();
});

setTimeout(() => {
  const url = "http://localhost:5173";
  console.log(`\n${YELLOW}Opening ${url} in your browser...${RESET}\n`);
  try {
    if (isWin) {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch {
    // No GUI browser available in this environment — the URL above still works.
  }
}, 4000);
