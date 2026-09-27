// Avatar presets: "<emblem>-<palette>" keys. The web app draws them; the API
// only accepts keys from this list.

export const AVATAR_PRESETS = [
  ["crown", "crimson"],
  ["gem", "ice"],
  ["bolt", "royal"],
  ["flame", "volcano"],
  ["star", "violet"],
  ["cherry", "jungle"],
  ["seven", "gold"],
  ["anchor", "ocean"],
  ["blossom", "sakura"],
  ["dice", "midnight"],
  ["chip", "emerald"],
  ["coin", "desert"],
] as const;

export type AvatarEmblem = (typeof AVATAR_PRESETS)[number][0];
export type AvatarPalette = (typeof AVATAR_PRESETS)[number][1];
export type AvatarKey = `${AvatarEmblem}-${AvatarPalette}`;

export const AVATAR_KEYS: readonly string[] = AVATAR_PRESETS.map(([emblem, palette]) => `${emblem}-${palette}`);

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && AVATAR_KEYS.includes(value);
}
