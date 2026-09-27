import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import { z } from "zod";
import { REFERRAL_BONUS_CENTS, WELCOME_BONUS_CENTS, normalizeReferralCode } from "../config.js";
import { revokeSessions, startSession } from "../lib/sessions.js";
import { verifyTotp } from "../lib/totp.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(40),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  // Only needed when the account has two-factor auth on.
  code: z.string().trim().optional(),
});

const profileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40).optional(),
    // Preset keys are "<emblem>-<palette>"; the web app owns the list.
    avatar: z.string().regex(/^[a-z]+-[a-z]+$/).max(32).nullable().optional(),
    ghostMode: z.boolean().optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "Nothing to update" });

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  referralCode: string;
  balanceCents: number;
  totpEnabled: boolean;
  ghostMode: boolean;
  createdAt: Date;
};

// The one shape every auth endpoint returns (never the password hash).
function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    referralCode: user.referralCode,
    balanceCents: user.balanceCents,
    totpEnabled: user.totpEnabled,
    ghostMode: user.ghostMode,
    createdAt: user.createdAt,
  };
}

export default async function authRoutes(app: FastifyInstance) {
  const perMinute = (max: number) => ({ config: { rateLimit: { max, timeWindow: "1 minute" } } });

  app.post("/auth/register", perMinute(app.limits.register), async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;
    const referralCode = normalizeReferralCode(parsed.data.referralCode);

    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    let referredBy = null;
    if (referralCode) {
      referredBy = await app.prisma.user.findUnique({ where: { referralCode } });
      if (!referredBy) {
        return reply.code(400).send({ error: "Invalid referral code" });
      }
    }

    const passwordHash = await argon2.hash(password);

    // New account and the referrer's bonus land together or not at all.
    const user = await app.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          referralCode: nanoid(8).toUpperCase(),
          referredById: referredBy?.id,
          balanceCents: WELCOME_BONUS_CENTS,
          transactions: {
            create: {
              type: "WELCOME_BONUS",
              amountCents: WELCOME_BONUS_CENTS,
              note: referredBy
                ? `Demo welcome bonus, invited by ${referredBy.displayName} (fake balance, no real value)`
                : "Demo welcome bonus (fake balance, no real value)",
            },
          },
        },
      });

      if (referredBy) {
        await tx.user.update({
          where: { id: referredBy.id },
          data: { balanceCents: { increment: REFERRAL_BONUS_CENTS } },
        });
        await tx.transaction.create({
          data: {
            userId: referredBy.id,
            type: "REFERRAL_BONUS",
            amountCents: REFERRAL_BONUS_CENTS,
            note: `Referral bonus for inviting ${displayName}`,
          },
        });
      }

      return created;
    });

    const token = await startSession(app, user.id, req);
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post("/auth/login", perMinute(app.limits.login), async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, code } = parsed.data;

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    // Checked only after the password, so neither leaks to someone guessing emails.
    if (user.breakUntil && user.breakUntil > new Date()) {
      return reply.code(403).send({ error: "On a break", code: "ON_BREAK", until: user.breakUntil });
    }
    if (user.totpEnabled && user.totpSecret) {
      if (!code) return reply.code(401).send({ error: "Two-factor code required", code: "TOTP_REQUIRED" });
      if (!verifyTotp(user.totpSecret, code)) {
        return reply.code(401).send({ error: "Invalid two-factor code", code: "TOTP_INVALID" });
      }
    }

    const token = await startSession(app, user.id, req);
    return reply.send({ token, user: publicUser(user) });
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    return publicUser(user);
  });

  app.patch("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const user = await app.prisma.user.update({
      where: { id: req.user.sub },
      data: parsed.data,
    });
    return publicUser(user);
  });

  app.post("/auth/password", { preHandler: [app.authenticate], ...perMinute(app.limits.password) }, async (req, reply) => {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { currentPassword, newPassword } = parsed.data;

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      return reply.code(400).send({ error: "Current password is incorrect" });
    }
    if (currentPassword === newPassword) {
      return reply.code(400).send({ error: "New password must be different from the current one" });
    }

    await app.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(newPassword) },
    });
    // A new password signs out every other device.
    const signedOut = await revokeSessions(app, user.id, req.user.sid);
    return { ok: true, signedOut };
  });
}
