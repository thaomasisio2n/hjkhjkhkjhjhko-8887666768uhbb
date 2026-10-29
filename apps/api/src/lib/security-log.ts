import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";

// Security-relevant events go to the log at "warn" with a `security` field,
// so an operator can filter them (e.g. `docker compose logs api | grep security`)
// to spot credential stuffing, throttling or cross-site attempts.
export type SecurityEvent =
  | "login_failed"
  | "login_throttled"
  | "totp_failed"
  | "totp_replayed"
  | "banned_login"
  | "shared_account_blocked"
  | "cross_site_blocked"
  | "rate_limited"
  | "server_busy";

/** Emails are hashed: enough to correlate attempts, without logging who. */
export const emailTag = (email: string) => createHash("sha256").update(email).digest("hex").slice(0, 12);

export function securityEvent(req: FastifyRequest, event: SecurityEvent, details: Record<string, unknown> = {}) {
  req.log.warn({ security: event, ip: req.ip, ...details }, `security: ${event}`);
}
