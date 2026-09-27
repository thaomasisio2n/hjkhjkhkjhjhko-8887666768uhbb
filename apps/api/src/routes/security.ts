import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { z } from "zod";
import { BREAK_DURATIONS, type BreakDuration, type SessionInfo } from "@novaspin/shared";
import { consumeTotp } from "../lib/accounts.js";
import { fail, parse, perMinute } from "../lib/http.js";
import { verifyPassword } from "../lib/passwords.js";
import { securityEvent } from "../lib/security-log.js";
import { clearSessionCookie } from "../lib/session-cookie.js";
import { revokeSessions } from "../lib/sessions.js";
import { generateSecret, otpauthUrl } from "../lib/totp.js";
import * as field from "../lib/validation.js";

const codeSchema = z.object({ code: field.totpCode });
const breakSchema = z.object({ duration: z.enum(Object.keys(BREAK_DURATIONS) as [BreakDuration, ...BreakDuration[]]) });
const passwordConfirmSchema = z.object({ password: field.existingPassword });

const HOUR_MS = 60 * 60 * 1000;

export default async function securityRoutes(app: FastifyInstance) {
  const signedIn = { preHandler: [app.authenticate] };
  // Everything that could lock other people out of the shared demo account.
  const ownAccount = { preHandler: [app.authenticate, app.denyShared] };
  const ownAccountLimited = { ...ownAccount, ...perMinute(app.limits.password) };

  /** Loads the signed-in user and checks a 2FA code, burning it on success. */
  async function requireTotp(userId: string, code: string, req: Parameters<typeof securityEvent>[0]) {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.totpSecret) fail("TOTP_SETUP_FIRST");
    const check = await consumeTotp(app, user, code);
    if (check !== "ok") {
      securityEvent(req, check === "replayed" ? "totp_replayed" : "totp_failed", { userId });
      fail("TOTP_INVALID");
    }
    return user;
  }

  app.post("/auth/logout", signedIn, async (req, reply) => {
    await app.prisma.session.update({ where: { id: req.user.sid }, data: { revokedAt: new Date() } });
    clearSessionCookie(req, reply);
    return reply.code(204).send();
  });

  // --- Sessions -----------------------------------------------------------

  app.get("/auth/sessions", signedIn, async (req): Promise<{ sessions: SessionInfo[] }> => {
    const sessions = await app.prisma.session.findMany({
      // On the shared demo account the other sessions are other visitors:
      // their IPs and devices are none of this visitor's business.
      where: { userId: req.user.sub, revokedAt: null, ...(req.account.shared ? { id: req.user.sid } : {}) },
      orderBy: { lastSeenAt: "desc" },
    });
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt.toISOString(),
        lastSeenAt: s.lastSeenAt.toISOString(),
        current: s.id === req.user.sid,
      })),
    };
  });

  app.delete("/auth/sessions/:id", signedIn, async (req, reply) => {
    const { id } = req.params as { id: string };
    // Signing yourself out is fine even on the shared account; others aren't yours.
    if (id !== req.user.sid) await app.denyShared(req);
    const { count } = await app.prisma.session.updateMany({
      where: { id, userId: req.user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) fail("SESSION_NOT_FOUND");
    if (id === req.user.sid) clearSessionCookie(req, reply);
    return reply.code(204).send();
  });

  app.post("/auth/sessions/revoke-others", ownAccount, async (req) => ({
    revoked: await revokeSessions(app, req.user.sub, req.user.sid),
  }));

  // --- Two-factor auth ----------------------------------------------------

  app.post("/auth/2fa/setup", ownAccountLimited, async (req) => {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (user.totpEnabled) fail("TOTP_ALREADY_ENABLED");

    const secret = generateSecret();
    // Conditional: never replace the secret of 2FA that got enabled meanwhile.
    const { count } = await app.prisma.user.updateMany({
      where: { id: user.id, totpEnabled: false },
      data: { totpSecret: secret, totpLastStep: null },
    });
    if (!count) fail("TOTP_ALREADY_ENABLED");
    const url = otpauthUrl(secret, user.email);
    const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0f212e", light: "#ffffff" } });
    return { secret, otpauthUrl: url, qrSvg };
  });

  app.post("/auth/2fa/enable", ownAccountLimited, async (req) => {
    const { code } = parse(codeSchema, req.body);
    const current = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub }, select: { totpEnabled: true } });
    if (current.totpEnabled) fail("TOTP_ALREADY_ENABLED");
    const user = await requireTotp(req.user.sub, code, req);
    // Only the secret the code was checked against gets enabled (a setup
    // racing this request can't swap in one the user never saw).
    const { count } = await app.prisma.user.updateMany({
      where: { id: user.id, totpEnabled: false, totpSecret: user.totpSecret },
      data: { totpEnabled: true },
    });
    if (!count) fail("TOTP_SETUP_FIRST");
    return { totpEnabled: true };
  });

  app.post("/auth/2fa/disable", ownAccountLimited, async (req) => {
    const { code } = parse(codeSchema, req.body);
    const current = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub }, select: { totpEnabled: true } });
    if (!current.totpEnabled) fail("TOTP_NOT_ENABLED");
    const user = await requireTotp(req.user.sub, code, req);
    await app.prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null, totpLastStep: null } });
    return { totpEnabled: false };
  });

  // --- Break in play ------------------------------------------------------

  app.post("/auth/break", ownAccount, async (req, reply) => {
    const { duration } = parse(breakSchema, req.body);
    const until = new Date(Date.now() + BREAK_DURATIONS[duration] * HOUR_MS);
    await app.prisma.user.update({ where: { id: req.user.sub }, data: { breakUntil: until } });
    await revokeSessions(app, req.user.sub);
    clearSessionCookie(req, reply);
    return { until: until.toISOString() };
  });

  // --- Account deletion ---------------------------------------------------

  app.delete("/auth/me", ownAccountLimited, async (req, reply) => {
    const { password } = parse(passwordConfirmSchema, req.body);
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!(await verifyPassword(user.passwordHash, password))) fail("CURRENT_PASSWORD_WRONG", { field: "password" });

    // Friends you invited keep their accounts; they just lose the link to you.
    // Sessions and chat messages cascade with the user row.
    await app.prisma.$transaction([
      app.prisma.user.updateMany({ where: { referredById: user.id }, data: { referredById: null } }),
      app.prisma.transaction.deleteMany({ where: { userId: user.id } }),
      app.prisma.user.delete({ where: { id: user.id } }),
    ]);
    clearSessionCookie(req, reply);
    return reply.code(204).send();
  });
}
