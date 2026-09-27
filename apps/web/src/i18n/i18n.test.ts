import { afterEach, describe, expect, it } from "vitest";
import en from "./en";
import pl from "./pl";
import { locale, setLocale, t, tc, translateServerError } from "./index";

afterEach(() => setLocale("en"));

describe("t()", () => {
  it("interpolates params and leaves unknown placeholders alone", () => {
    expect(t("game.moreFrom", { provider: "Nova Reels" })).toBe("More from Nova Reels");
    expect(t("game.moreFrom")).toBe("More from {provider}");
  });

  it("returns the key for unknown messages", () => {
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("follows the active locale", () => {
    setLocale("pl");
    expect(locale.value).toBe("pl");
    expect(t("nav.wallet")).toBe("Portfel");
    setLocale("en");
    expect(t("nav.wallet")).toBe("Wallet");
  });
});

describe("tc() plurals", () => {
  it("uses English one/other", () => {
    expect(tc("lobby.gamesCount", 1)).toBe("1 game");
    expect(tc("lobby.gamesCount", 2)).toBe("2 games");
  });

  it("uses Polish one/few/many", () => {
    setLocale("pl");
    expect(tc("lobby.gamesCount", 1)).toBe("1 gra");
    expect(tc("lobby.gamesCount", 3)).toBe("3 gry");
    expect(tc("lobby.gamesCount", 5)).toBe("5 gier");
    expect(tc("lobby.gamesCount", 12)).toBe("12 gier");
    expect(tc("lobby.gamesCount", 22)).toBe("22 gry");
    expect(tc("search.results", 14)).toBe("14 wyników");
  });
});

describe("server errors", () => {
  it("translates known API messages and passes others through", () => {
    setLocale("pl");
    expect(translateServerError("Invalid credentials")).toBe("Nieprawidłowy email lub hasło");
    expect(translateServerError("Something new")).toBe("Something new");
    setLocale("en");
    expect(translateServerError("Invalid credentials")).toBe("Invalid credentials");
  });
});

describe("dictionaries", () => {
  const leaves = (tree: object, prefix = ""): string[] =>
    Object.entries(tree).flatMap(([k, v]) =>
      typeof v === "string" || (v && typeof v === "object" && "other" in v) ? [prefix + k] : leaves(v, `${prefix}${k}.`)
    );

  it("has a Polish entry for every English key", () => {
    const plKeys = new Set(leaves(pl));
    const missing = leaves(en).filter((k) => !k.startsWith("serverErrors") && !plKeys.has(k));
    expect(missing).toEqual([]);
  });
});
