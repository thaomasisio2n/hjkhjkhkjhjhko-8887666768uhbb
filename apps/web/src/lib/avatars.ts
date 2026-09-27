import { AVATAR_PRESETS } from "@novaspin/shared";
import { PALETTES, type Emblem, type Palette } from "./gameArt";

// Avatar presets reuse the game-cover emblems. The list of keys is shared
// with the API, which only accepts these.

export interface AvatarPreset {
  key: string;
  emblem: Emblem;
  palette: Palette;
}

export const AVATARS: AvatarPreset[] = AVATAR_PRESETS.map(([emblem, palette]) => ({
  key: `${emblem}-${palette}`,
  emblem,
  palette: PALETTES[palette],
}));

export function avatarPreset(key: string | null | undefined): AvatarPreset | null {
  return AVATARS.find((a) => a.key === key) ?? null;
}
