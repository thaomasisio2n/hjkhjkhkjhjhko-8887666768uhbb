import { API_ERRORS, isApiErrorCode, type ApiErrorBody, type ApiErrorCode } from "@novaspin/shared";
import type { ZodType } from "zod";

type ErrorExtras = Omit<ApiErrorBody, "error" | "code">;

// HTTP status each error code answers with unless a route says otherwise.
const STATUS: Partial<Record<ApiErrorCode, number>> = {
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  TOTP_REQUIRED: 401,
  FORBIDDEN_ORIGIN: 403,
  REGISTRATION_CLOSED: 403,
  BANNED: 403,
  ON_BREAK: 403,
  SHARED_ACCOUNT: 403,
  CHAT_CLOSED: 403,
  NOT_FOUND: 404,
  REFERRAL_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  GAME_NOT_FOUND: 404,
  CHAT_ROOM_UNKNOWN: 404,
  EMAIL_TAKEN: 409,
  TOTP_ALREADY_ENABLED: 409,
  RATE_LIMITED: 429,
  ACCOUNT_THROTTLED: 429,
  INTERNAL: 500,
  SERVER_BUSY: 503,
};

/** An expected failure with a stable code; the error handler turns it into the JSON body. */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: ApiErrorCode,
    readonly extras: ErrorExtras = {},
    statusCode?: number
  ) {
    super(API_ERRORS[code]);
    this.statusCode = statusCode ?? STATUS[code] ?? 400;
  }

  toBody(): ApiErrorBody {
    const amount = this.extras.amountCents;
    const error =
      amount === undefined ? this.message : this.message.replace("{amount}", `$${(amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    return { error, code: this.code, ...this.extras };
  }
}

export function fail(code: ApiErrorCode, extras?: ErrorExtras, statusCode?: number): never {
  throw new ApiError(code, extras, statusCode);
}

/**
 * Validates untrusted input. Schemas use error codes as their messages, so
 * the first problem becomes the response code (plus the field it's about).
 */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue?.path.join(".") || undefined;
  // Always 400: a malformed form is never an auth failure, whatever the code says.
  fail(isApiErrorCode(issue?.message) ? issue.message : "INVALID_INPUT", { field }, 400);
}

/** Route option for a per-IP limit tighter than the global one. */
export const perMinute = (max: number) => ({ config: { rateLimit: { max, timeWindow: "1 minute" } } });
