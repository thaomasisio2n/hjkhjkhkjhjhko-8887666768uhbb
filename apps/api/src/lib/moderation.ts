// Server-side chat rules, modelled on the usual casino chat guidelines:
// no shouting, no link shorteners, no repeated spam.

export const CHAT_ROOMS = ["en", "pl"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];
export const MAX_CHAT_LENGTH = 240;

const SHORTENERS = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|cutt\.ly|rb\.gy|shorturl\.at)\//i;

export type ModerationResult = { ok: true; body: string } | { ok: false; error: string };

export function moderateMessage(raw: string): ModerationResult {
  // Strip control characters, collapse whitespace.
  const body = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!body) return { ok: false, error: "Message is empty" };
  if (body.length > MAX_CHAT_LENGTH) return { ok: false, error: "Message is too long" };

  const letters = body.replace(/[^\p{L}]/gu, "");
  const upper = letters.replace(/[^\p{Lu}]/gu, "");
  if (letters.length >= 8 && upper.length / letters.length > 0.7) {
    return { ok: false, error: "Please don't shout — ease off the caps" };
  }
  if (SHORTENERS.test(body)) return { ok: false, error: "Link shorteners aren't allowed — post the full link" };
  return { ok: true, body };
}
