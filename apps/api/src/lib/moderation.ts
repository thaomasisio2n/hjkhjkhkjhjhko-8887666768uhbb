// Server-side chat rules, modelled on the usual casino chat guidelines:
// no shouting, no link shorteners, no invisible-character tricks.
import { CHAT_MAX_LENGTH, type ApiErrorCode } from "@novaspin/shared";

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rb\.gy|shorturl\.at)\//i;
// Control characters and format characters (zero-width, bidi overrides that
// flip text direction to disguise links or impersonate someone).
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;
// "Zalgo" text: more than two stacked combining marks on one character.
const STACKED_MARKS = /(\p{M}{2})\p{M}+/gu;

export type ModerationResult = { ok: true; body: string } | { ok: false; code: ApiErrorCode };

export function moderateMessage(raw: string): ModerationResult {
  const body = raw.replace(INVISIBLE, " ").replace(STACKED_MARKS, "$1").replace(/\s+/g, " ").trim();
  if (!body) return { ok: false, code: "CHAT_EMPTY" };
  if (body.length > CHAT_MAX_LENGTH) return { ok: false, code: "CHAT_TOO_LONG" };

  const letters = body.replace(/[^\p{L}]/gu, "");
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  if (letters.length >= 8 && upper.length / letters.length > 0.7) return { ok: false, code: "CHAT_SHOUTING" };
  if (SHORTENERS.test(body)) return { ok: false, code: "CHAT_SHORTENER" };
  return { ok: true, body };
}
