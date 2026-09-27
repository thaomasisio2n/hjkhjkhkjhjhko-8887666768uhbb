#!/usr/bin/env node
// postinstall: compiles @novaspin/shared so both apps can import it. Slim
// runtime images copy the already-built output without sources or
// TypeScript; there's nothing to do then.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tsc = path.join(root, "node_modules/typescript/bin/tsc");
if (!existsSync(path.join(root, "packages/shared/src")) || !existsSync(tsc)) process.exit(0);

const result = spawnSync(process.execPath, [tsc, "-p", path.join(root, "packages/shared/tsconfig.json")], { stdio: "inherit" });
process.exit(result.status ?? 1);
