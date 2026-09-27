// Every error the API can answer with. Responses carry the code plus the
// English message; the web app shows its own translation for the code.
// `{amount}` placeholders are filled from the response's `amountCents`.

export const API_ERRORS = {
  // General
  INVALID_INPUT: "Some of the details aren't valid.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN_ORIGIN: "Requests from other sites aren't allowed.",
  NOT_FOUND: "Not found",
  RATE_LIMITED: "Too many attempts — try again in a minute.",
  SERVER_BUSY: "The server is busy — try again in a moment.",
  INTERNAL: "Something went wrong on our side. Please try again.",

  // Sign-up and profile
  REGISTRATION_CLOSED: "Sign-ups are closed on this demo right now.",
  EMAIL_INVALID: "Enter a valid email address",
  EMAIL_TAKEN: "Email already registered",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_TOO_LONG: "Password must be at most 128 characters",
  PASSWORD_TOO_COMMON: "That password is too common — pick something less guessable",
  USERNAME_LENGTH: "Username must be 2–40 characters",
  USERNAME_CHARACTERS: "Username contains characters that aren't allowed",
  USERNAME_LINK: "Usernames can't contain links",
  USERNAME_RESERVED: "That username is reserved",
  AVATAR_INVALID: "Pick one of the avatars on offer",
  NOTHING_TO_UPDATE: "Nothing to update",
  REFERRAL_NOT_FOUND: "Referral code not found",

  // Sign-in and security
  INVALID_CREDENTIALS: "Invalid credentials",
  ACCOUNT_THROTTLED: "Too many failed sign-ins for this account — try again later.",
  BANNED: "This account has been suspended.",
  ON_BREAK: "You're on a break from playing.",
  TOTP_REQUIRED: "Two-factor code required",
  TOTP_INVALID: "Invalid two-factor code",
  TOTP_FORMAT: "Enter the 6-digit code from your app",
  TOTP_ALREADY_ENABLED: "Two-factor auth is already enabled",
  TOTP_NOT_ENABLED: "Two-factor auth is not enabled",
  TOTP_SETUP_FIRST: "Start the two-factor setup first",
  PASSWORD_REQUIRED: "Password is required",
  CURRENT_PASSWORD_WRONG: "Current password is incorrect",
  PASSWORD_UNCHANGED: "New password must be different from the current one",
  SHARED_ACCOUNT: "This is the shared demo account, so this setting is locked. Create your own account to try it.",
  SESSION_NOT_FOUND: "Session not found",

  // Wallet
  DEPOSIT_LIMIT: "Daily deposit limit reached — you can deposit up to {amount} more in the next 24 hours.",
  BALANCE_CAP: "Demo balances are capped at {amount} — that's plenty of fake money.",

  // Games
  GAME_NOT_FOUND: "Game not found",

  // Chat
  CHAT_CLOSED: "Chat is paused on this demo right now.",
  CHAT_ROOM_UNKNOWN: "Unknown chat room",
  CHAT_EMPTY: "Message is empty",
  CHAT_TOO_LONG: "Message is too long",
  CHAT_SHOUTING: "Please don't shout — ease off the caps",
  CHAT_SHORTENER: "Link shorteners aren't allowed — post the full link",
  CHAT_REPEAT: "Don't repeat yourself — wait a moment",
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && Object.hasOwn(API_ERRORS, value);
}

/** Shape of every non-2xx JSON body. Extra fields depend on the code. */
export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
  /** The form field a validation error refers to. */
  field?: string;
  /** DEPOSIT_LIMIT: what's left today; BALANCE_CAP: the cap. */
  amountCents?: number;
  /** ON_BREAK: when the break ends (ISO). */
  until?: string;
  /** RATE_LIMITED, ACCOUNT_THROTTLED: how long to wait. */
  retryAfterMs?: number;
}
