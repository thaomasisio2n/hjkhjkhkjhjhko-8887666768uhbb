// Demo economy + URLs, shared by routes and the seed script.
export const WELCOME_BONUS_CENTS = Number(process.env.WELCOME_BONUS_CENTS ?? 1_000_000);
export const REFERRAL_BONUS_CENTS = Number(process.env.REFERRAL_BONUS_CENTS ?? 500_000);
export const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/+$/, "");

export function referralLink(code: string) {
  return `${WEB_ORIGIN}/register?ref=${encodeURIComponent(code)}`;
}

// Codes are generated upper-case; accept whatever casing/spacing people type.
export function normalizeReferralCode(code: string | undefined | null) {
  const normalized = (code ?? "").trim().toUpperCase();
  return normalized || undefined;
}
