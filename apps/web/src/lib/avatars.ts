import { PALETTES, type Emblem, type Palette } from "./gameArt";

type PaletteName = keyof typeof PALETTES;

// Avatar presets reuse the game-cover emblems. Keys are "<emblem>-<palette>",
// which is also the shape the API validates.
const PRESETS: [Emblem, PaletteName][] = [
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
];

export interface AvatarPreset {
  key: string;
  emblem: Emblem;
  palette: Palette;
}

export const AVATARS: AvatarPreset[] = PRESETS.map(([emblem, palette]) => ({
  key: `${emblem}-${palette}`,
  emblem,
  palette: PALETTES[palette],
}));

export function avatarPreset(key: string | null | undefined): AvatarPreset | null {
  return AVATARS.find((a) => a.key === key) ?? null;
}
