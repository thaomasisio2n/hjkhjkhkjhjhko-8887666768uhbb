import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import QRCode from "qrcode";
import { z } from "zod";
import { revokeSessions } from "../lib/sessions.js";
import { generateSecret, otpauthUrl, verifyTotp } from "../lib/totp.js";

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

const BREAK_DURATIONS = { "1h": 1, "24h": 24, "7d": 24 * 7, "30d": 24 * 30 } as const;
const breakSchema = z.object({ duration: z.enum(Object.keys(BREAK_DURATIONS) as [keyof typeof BREAK_DURATIONS]) });

const deleteSchema = z.object({ password: z.string().min(1) });

export default async function securityRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };
  const limited = (max: number) => ({ ...auth, config: { rateLimit: { max, timeWindow: "1 minute" } } });

  app.post("/auth/logout", auth, async (req, reply) => {
    await app.prisma.session.update({ where: { id: req.user.sid }, data: { revokedAt: new Date() } });
    return reply.code(204).send();
  });

  // --- Sessions -----------------------------------------------------------

  app.get("/auth/sessions", auth, async (req) => {
    const sessions = await app.prisma.session.findMany({
      where: { userId: req.user.sub, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        current: s.id === req.user.sid,
      })),
    };
  });

  app.delete("/auth/sessions/:id", auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { count } = await app.prisma.session.updateMany({
      where: { id, userId: req.user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) return reply.code(404).send({ error: "Session not found" });
    return reply.code(204).send();
  });

  app.post("/auth/sessions/revoke-others", auth, async (req) => ({
    revoked: await revokeSessions(app, req.user.sub, req.user.sid),
  }));

  // --- Two-factor auth ----------------------------------------------------

  app.post("/auth/2fa/setup", auth, async (req, reply) => {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (user.totpEnabled) return reply.code(409).send({ error: "Two-factor auth is already enabled" });

    const secret = generateSecret();
    await app.prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    const url = otpauthUrl(secret, user.email);
    const qrSvg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0f212e", light: "#ffffff" } });
    return { secret, otpauthUrl: url, qrSvg };
  });

  app.post("/auth/2fa/enable", limited(app.limits.password), async (req, reply) => {
    const parsed = codeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Enter the 6-digit code from your app" });

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (user.totpEnabled) return reply.code(409).send({ error: "Two-factor auth is already enabled" });
    if (!user.totpSecret) return reply.code(400).send({ error: "Start the two-factor setup first" });
    if (!verifyTotp(user.totpSecret, parsed.data.code)) {
      return reply.code(400).send({ error: "Invalid two-factor code", code: "TOTP_INVALID" });
    }

    await app.prisma.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
    return { totpEnabled: true };
  });

  app.post("/auth/2fa/disable", limited(app.limits.password), async (req, reply) => {
    const parsed = codeSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Enter the 6-digit code from your app" });

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!user.totpEnabled || !user.totpSecret) return reply.code(400).send({ error: "Two-factor auth is not enabled" });
    if (!verifyTotp(user.totpSecret, parsed.data.code)) {
      return reply.code(400).send({ error: "Invalid two-factor code", code: "TOTP_INVALID" });
    }

    await app.prisma.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    return { totpEnabled: false };
  });

  // --- Break in play ------------------------------------------------------

  app.post("/auth/break", auth, async (req, reply) => {
    const parsed = breakSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const until = new Date(Date.now() + BREAK_DURATIONS[parsed.data.duration] * 60 * 60 * 1000);
    await app.prisma.user.update({ where: { id: req.user.sub }, data: { breakUntil: until } });
    await revokeSessions(app, req.user.sub);
    return { until };
  });

  // --- Account deletion ---------------------------------------------------

  app.delete("/auth/me", limited(app.limits.password), async (req, reply) => {
    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Password is required" });

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!(await argon2.verify(user.passwordHash, parsed.data.password))) {
      return reply.code(400).send({ error: "Current password is incorrect" });
    }

    // Friends you invited keep their accounts; they just lose the link to you.
    // Sessions and chat messages cascade with the user row.
    await app.prisma.$transaction([
      app.prisma.user.updateMany({ where: { referredById: user.id }, data: { referredById: null } }),
      app.prisma.transaction.deleteMany({ where: { userId: user.id } }),
      app.prisma.user.delete({ where: { id: user.id } }),
    ]);
    return reply.code(204).send();
  });
}
