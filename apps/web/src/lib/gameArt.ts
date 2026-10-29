// Procedural cover art for placeholder games: every title gets a stable
// palette + emblem, so the lobby looks like a real catalog without shipping
// any third-party artwork.

export type Palette = readonly [light: string, mid: string, deep: string];

export type Emblem =
  | "seven"
  | "gem"
  | "crown"
  | "star"
  | "bolt"
  | "pyramid"
  | "anchor"
  | "flame"
  | "snowflake"
  | "roulette"
  | "wheel"
  | "cards"
  | "chip"
  | "blossom"
  | "coin"
  | "cherry"
  | "dice"
  | "gift";

export const PALETTES = {
  gold: ["#ffe29a", "#f0a202", "#4a2100"],
  crimson: ["#ff9aae", "#d00036", "#35000f"],
  violet: ["#d2bcff", "#7c3aed", "#1a0842"],
  emerald: ["#9dffcf", "#0ea860", "#01261a"],
  neon: ["#ffa8f6", "#d0189e", "#26052f"],
  ice: ["#d4f4ff", "#2f8fe0", "#081a42"],
  volcano: ["#ffc98a", "#ff4d00", "#360800"],
  ocean: ["#a8f3ff", "#0891b2", "#04233a"],
  royal: ["#b8c3ff", "#3842d6", "#0b0f3f"],
  sakura: ["#ffd6e5", "#f4608f", "#420b27"],
  jungle: ["#e0fba8", "#4d9e1c", "#0c2208"],
  desert: ["#ffe3ad", "#e07a1f", "#361604"],
  midnight: ["#a9bbff", "#334aa8", "#070d29"],
} as const satisfies Record<string, Palette>;

type PaletteName = keyof typeof PALETTES;

// First match wins. A null palette means "pick one from the title hash", used
// for generic table/live formats so a row of roulettes doesn't look cloned.
const RULES: [RegExp, PaletteName | null, Emblem][] = [
  [/dice|craps|sic bo/i, null, "dice"],
  [/blackjack|poker|hold'?em|pai gow|punto/i, null, "cards"],
  [/baccarat|dragon tiger/i, null, "chip"],
  [/roulette/i, null, "roulette"],
  [/wheel/i, null, "wheel"],
  [/seven/i, null, "seven"],
  [/zeus/i, "royal", "bolt"],
  [/thunder|storm|lightning/i, "midnight", "bolt"],
  [/diamond/i, "ice", "gem"],
  [/emerald/i, "emerald", "gem"],
  [/jewel|gem|ruby/i, null, "gem"],
  [/volcano|fire|flame|inferno|blaz/i, "volcano", "flame"],
  [/frost|froz|ice|snow/i, "ice", "snowflake"],
  [/pharaoh|egypt/i, "desert", "pyramid"],
  [/temple|ancient/i, "gold", "pyramid"],
  [/sakura|blossom/i, "sakura", "blossom"],
  [/pirate|hoard/i, "ocean", "coin"],
  [/starfall|cosmic|galaxy/i, "midnight", "star"],
  [/treasure|riches|millions|coin/i, "gold", "coin"],
  [/anchor|sea|tide/i, "ocean", "anchor"],
  [/ransom/i, "royal", "crown"],
  [/jungle/i, "jungle", "crown"],
  [/frontier|west/i, "desert", "star"],
  [/crown|king|royal/i, "crimson", "crown"],
  [/mystic|magic|fortune|star/i, "violet", "star"],
  [/fruit/i, "jungle", "cherry"],
  [/neon/i, "neon", "cherry"],
  [/gold|vault/i, "gold", "seven"],
  [/lucky/i, "emerald", "cherry"],
];

const CATEGORY_EMBLEM: Record<string, Emblem> = {
  Slots: "seven",
  "Live Casino": "chip",
  "Table Games": "cards",
  Jackpots: "crown",
};

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function artFor(title: string, category: string): { palette: Palette; emblem: Emblem } {
  const names = Object.keys(PALETTES) as PaletteName[];
  const hashed = PALETTES[names[hash(title) % names.length]!];

  const rule = RULES.find(([re]) => re.test(title));
  if (rule) return { palette: rule[1] ? PALETTES[rule[1]] : hashed, emblem: rule[2] };
  return { palette: hashed, emblem: CATEGORY_EMBLEM[category] ?? "seven" };
}
