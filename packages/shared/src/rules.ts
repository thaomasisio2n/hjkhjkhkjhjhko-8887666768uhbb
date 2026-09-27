// Limits the API enforces and the web app mirrors in its forms. One source,
// so a form can never accept something the API will reject (or vice versa).

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_LENGTH = { min: 8, max: 128 } as const;
export const USERNAME_LENGTH = { min: 2, max: 40 } as const;
export const TOTP_DIGITS = 6;

export const CHAT_ROOMS = ["en", "pl"] as const;
export type ChatRoom = (typeof CHAT_ROOMS)[number];
export const CHAT_MAX_LENGTH = 240;

/** Break-in-play options and their length in hours. */
export const BREAK_DURATIONS = { "1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;
export type BreakDuration = keyof typeof BREAK_DURATIONS;

export const DEPOSIT_LIMIT = {
  minCents: 1_000,
  maxCents: 100_000_000,
  presetsCents: [10_000, 50_000, 100_000, 500_000],
} as const;

export const TOPUP = {
  maxCents: 100_000_000,
  methods: ["crypto_btc", "crypto_eth", "crypto_usdt"],
} as const;
export type TopupMethod = (typeof TOPUP.methods)[number];

/** Fake balances stop growing here ($10M), well inside the 32-bit column. */
export const MAX_BALANCE_CENTS = 1_000_000_000;
