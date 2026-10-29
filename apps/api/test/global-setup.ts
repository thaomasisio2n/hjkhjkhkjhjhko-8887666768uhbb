import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Fresh schema for every run: drop the throwaway DB and apply all migrations.
export default function setup() {
  for (const suffix of ["", "-journal"]) rmSync(path.join(apiDir, "prisma", `test.db${suffix}`), { force: true });
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "pipe",
  });
}
