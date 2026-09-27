// Demo economy + URLs, shared by routes and the seed script.
export const WELCOME_BONUS_CENTS = Number(process.env.WELCOME_BONUS_CENTS ?? 1_000_000);
export const REFERRAL_BONUS_CENTS = Number(process.env.REFERRAL_BONUS_CENTS ?? 500_000);
export const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/+$/, "");

export const DEFAULT_JWT_SECRET = "change-me-in-real-life-this-is-a-demo";
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

// Per-IP limits (requests per minute) for endpoints worth brute-forcing.
// RATE_LIMIT_SCALE lets e2e runs loosen them without code changes.
const scale = Number(process.env.RATE_LIMIT_SCALE ?? 1);
export const RATE_LIMITS = {
  login: 20 * scale,
  register: 10 * scale,
  password: 10 * scale,
  lookup: 120 * scale,
};
export type RateLimits = typeof RATE_LIMITS;

export function referralLink(code: string) {
  return `${WEB_ORIGIN}/register?ref=${encodeURIComponent(code)}`;
}

// Codes are generated upper-case; accept whatever casing/spacing people type.
export function normalizeReferralCode(code: string | undefined | null) {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized || undefined;
}
