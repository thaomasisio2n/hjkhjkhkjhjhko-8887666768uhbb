import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n";
import { AVATARS, avatarPreset } from "./avatars";
import { categoryLabel, categoryMeta, slugify, sortCategories } from "./categories";
import { artFor, PALETTES } from "./gameArt";

afterEach(() => setLocale("en"));

describe("game art", () => {
  it("is deterministic per title", () => {
    expect(artFor("Mystic Fortune", "Slots")).toEqual(artFor("Mystic Fortune", "Slots"));
  });

  it("matches themed titles to emblems and palettes", () => {
    expect(artFor("Zeus Mobile Rush", "Slots")).toEqual({ palette: PALETTES.royal, emblem: "bolt" });
    expect(artFor("Frozen Fortune Vault", "Jackpots").emblem).toBe("snowflake");
    expect(artFor("Craps Classic", "Table Games").emblem).toBe("dice");
  });

  it("falls back to a category emblem and a known palette", () => {
    const art = artFor("Zzzz Unknown", "Live Casino");
    expect(art.emblem).toBe("chip");
    expect(Object.values(PALETTES)).toContain(art.palette);
  });
});

describe("categories", () => {
  it("orders known categories first, then the rest alphabetically", () => {
    expect(sortCategories(["Jackpots", "Crash", "Slots", "Bingo"]).map((c) => c.name)).toEqual([
      "Slots",
      "Jackpots",
      "Bingo",
      "Crash",
    ]);
  });

  it("slugifies unknown categories and localises known ones", () => {
    expect(categoryMeta("Game Shows")).toMatchObject({ slug: "game-shows", icon: "grid" });
    expect(slugify("  Live  Casino! ")).toBe("live-casino");
    setLocale("pl");
    expect(categoryLabel("Table Games")).toBe("Gry stołowe");
    expect(categoryLabel("Game Shows")).toBe("Game Shows");
  });
});

describe("avatars", () => {
  it("uses keys the API accepts", () => {
    for (const a of AVATARS) expect(a.key).toMatch(/^[a-z]+-[a-z]+$/);
    expect(new Set(AVATARS.map((a) => a.key)).size).toBe(AVATARS.length);
  });

  it("resolves presets and ignores unknown keys", () => {
    expect(avatarPreset("crown-crimson")?.emblem).toBe("crown");
    expect(avatarPreset("nope-nope")).toBeNull();
    expect(avatarPreset(null)).toBeNull();
  });
});
