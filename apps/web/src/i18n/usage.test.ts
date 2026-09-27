import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import pl from "./pl";

// Every literal key passed to t()/tc() in the app must exist in both languages.
const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "i18n" ? [] : sourceFiles(full);
    return /\.(vue|ts)$/.test(name) && !name.endsWith(".test.ts") ? [full] : [];
  });
}

const lookup = (tree: unknown, key: string) =>
  key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), tree);

describe("i18n key usage", () => {
  const keys = new Set<string>();
  for (const file of sourceFiles(src)) {
    for (const m of readFileSync(file, "utf8").matchAll(/\b(?:t|tc)\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/g)) keys.add(m[1]!);
  }

  it("finds keys to check", () => {
    expect(keys.size).toBeGreaterThan(200);
  });

  it("resolves every used key in English and Polish", () => {
    const missing = [...keys].filter((k) => lookup(en, k) === undefined || lookup(pl, k) === undefined);
    expect(missing).toEqual([]);
  });
});
