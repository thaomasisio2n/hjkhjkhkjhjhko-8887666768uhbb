// Demo economy + URLs, shared by routes and the seed script.
export const WELCOME_BONUS_CENTS = Number(process.env.WELCOME_BONUS_CENTS ?? 1_000_000);
export const REFERRAL_BONUS_CENTS = Number(process.env.REFERRAL_BONUS_CENTS ?? 500_000);
// Fake balances stop growing here ($10M), well inside the 32-bit column.
export const MAX_BALANCE_CENTS = 1_000_000_000;
export const WEB_ORIGIN = (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/+$/, "");

export const DEFAULT_JWT_SECRET = "change-me-in-real-life-this-is-a-demo";
export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
// Tokens (and so sessions) expire after this; people just sign in again.
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const flag = (name: string) => /^(1|true|yes|on)$/i.test(process.env[name] ?? "");

// Kill switches for a public showcase: flip them in the environment and
// restart, no code changes needed.
export const FEATURES = {
  registration: !flag("DISABLE_REGISTRATION"),
  chat: !flag("DISABLE_CHAT"),
};
export type Features = typeof FEATURES;

// Behind a reverse proxy / load balancer, req.ip is the proxy unless Fastify
// is told which X-Forwarded-For hops to trust. Leave unset when the API is
// reached directly: trusting the header then lets anyone fake their IP and
// dodge every rate limit. Accepts a hop count ("1") or a list of IPs/CIDRs.
export type TrustProxy = boolean | string[] | ((address: string, hop: number) => boolean);
export function trustProxySetting(value = process.env.TRUST_PROXY): TrustProxy {
  if (!value) return false;
  if (/^\d+$/.test(value)) {
    // Trust the nearest N hops (what Fastify does with a number, spelled out for the types).
    const hops = Number(value);
    return (_address, hop) => hop < hops;
  }
  if (/^(true|false)$/i.test(value)) {
    throw new Error("TRUST_PROXY must be a hop count (e.g. 1) or a list of proxy IPs/CIDRs, not true/false.");
  }
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// Per-IP limits (requests per minute) for endpoints worth brute-forcing.
// RATE_LIMIT_SCALE lets e2e runs loosen them without code changes.
const scale = Number(process.env.RATE_LIMIT_SCALE ?? 1);
export const RATE_LIMITS = {
  // Backstop for every route that has no tighter limit of its own.
  global: 300 * scale,
  login: 20 * scale,
  register: 10 * scale,
  password: 10 * scale,
  lookup: 120 * scale,
  chat: 12 * scale,
  topup: 30 * scale,
  // Failed sign-ins per email (any IP) before that email is paused for 15 min.
  loginFailures: 10 * scale,
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
