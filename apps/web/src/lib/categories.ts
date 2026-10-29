import type { IconName } from "./icons";
import { t, te } from "../i18n";

export interface CategoryMeta {
  name: string;
  slug: string;
  icon: IconName;
}

// Display order + icon for the categories the API serves. Unknown categories
// still render (slugified, generic icon) so the catalog can grow freely.
const KNOWN: CategoryMeta[] = [
  { name: "Slots", slug: "slots", icon: "cherry" },
  { name: "Live Casino", slug: "live-casino", icon: "live" },
  { name: "Table Games", slug: "table-games", icon: "spade" },
  { name: "Jackpots", slug: "jackpots", icon: "crown" },
];

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Localised display name; the API's English name is the fallback. */
export function categoryLabel(name: string) {
  const meta = categoryMeta(name);
  const key = `categories.${meta.slug}`;
  return te(key) ? t(key) : name;
}

export function categoryMeta(name: string): CategoryMeta {
  return KNOWN.find((c) => c.name === name) ?? { name, slug: slugify(name), icon: "grid" };
}

export function sortCategories(names: string[]): CategoryMeta[] {
  const order = (n: string) => {
    const i = KNOWN.findIndex((c) => c.name === n);
    return i === -1 ? KNOWN.length : i;
  };
  return [...names].sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map(categoryMeta);
}

export const KNOWN_CATEGORIES = KNOWN;
