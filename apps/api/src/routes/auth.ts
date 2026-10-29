import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { z } from "zod";
import { MAX_BALANCE_CENTS } from "@novaspin/shared";
import { REFERRAL_BONUS_CENTS, WELCOME_BONUS_CENTS, normalizeReferralCode } from "../config.js";
import { assertNameNotShared, consumeTotp, publicUser } from "../lib/accounts.js";
import { isTrustedDevice, setDeviceCookie } from "../lib/device-cookie.js";
import { fail, parse, perMinute } from "../lib/http.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { emailTag, securityEvent } from "../lib/security-log.js";
import { clearSessionCookie } from "../lib/session-cookie.js";
import { revokeSessions, startSession } from "../lib/sessions.js";
import * as field from "../lib/validation.js";

const registerSchema = z.object({
  email: field.email,
  password: field.newPassword,
  displayName: field.displayName,
  referralCode: z.string().max(32).optional(),
});

const loginSchema = z.object({
  email: field.email,
  password: field.existingPassword,
  // Only needed when the account has two-factor auth on.
  code: z.string().trim().max(10).optional(),
});

const profileSchema = z
  .object({
    displayName: field.displayName.optional(),
    avatar: field.avatar.nullable().optional(),
    ghostMode: z.boolean().optional(),
  })
  .strict()
  .refine((d) => Object.values(d).some((v) => v !== undefined), "NOTHING_TO_UPDATE");

const passwordSchema = z.object({
  currentPassword: field.existingPassword,
  newPassword: field.newPassword,
});

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", perMinute(app.limits.register), async (req, reply) => {
    if (!app.features.registration) fail("REGISTRATION_CLOSED");
    const { email, password, displayName, ...body } = parse(registerSchema, req.body);
    const referralCode = normalizeReferralCode(body.referralCode);

    await assertNameNotShared(app, displayName);
    // Note: this reveals whether an email has an account. Without email
    // verification there's no way to hide it on sign-up; it's rate-limited.
    if (await app.prisma.user.findUnique({ where: { email }, select: { id: true } })) fail("EMAIL_TAKEN");

    const referredBy = referralCode ? await app.prisma.user.findUnique({ where: { referralCode } }) : null;
    if (referralCode && (!referredBy || referredBy.bannedAt)) fail("REFERRAL_NOT_FOUND", { field: "referralCode" }, 400);

    const passwordHash = await hashPassword(password);

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

      // Conditional so mass sign-ups on one code can't push the referrer's
      // balance past the cap (the friend still joins, just without a bonus).
      if (referredBy) {
        const { count } = await tx.user.updateMany({
          where: { id: referredBy.id, balanceCents: { lte: MAX_BALANCE_CENTS - REFERRAL_BONUS_CENTS } },
          data: { balanceCents: { increment: REFERRAL_BONUS_CENTS } },
        });
        if (count) {
          await tx.transaction.create({
            data: {
              userId: referredBy.id,
              type: "REFERRAL_BONUS",
              amountCents: REFERRAL_BONUS_CENTS,
              note: `Referral bonus for inviting ${displayName}`,
            },
          });
        }
      }
      return created;
    });

    await startSession(app, req, reply, user.id);
    setDeviceCookie(req, reply, user.id);
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.post("/auth/login", perMinute(app.limits.login), async (req, reply) => {
    const { email, password, code } = parse(loginSchema, req.body);
    const user = await app.prisma.user.findUnique({ where: { email } });

    // The shared demo password is public anyway; throttling it would only let
    // one person lock everyone else out of the demo. And a browser that has
    // signed in to this account before gets past the throttle, so an attacker
    // can't lock the real owner out by failing on purpose.
    const throttled = !user?.shared;
    const waitMs = throttled && !isTrustedDevice(req, user?.id) ? app.loginThrottle.blockedFor(email) : 0;
    if (waitMs) {
      securityEvent(req, "login_throttled", { email: emailTag(email) });
      fail("ACCOUNT_THROTTLED", { retryAfterMs: waitMs });
    }
    const failed = (event: "login_failed" | "totp_failed" | "totp_replayed", code: "INVALID_CREDENTIALS" | "TOTP_INVALID") => {
      if (throttled) app.loginThrottle.fail(email);
      securityEvent(req, event, { email: emailTag(email) });
      return fail(code, {}, 401);
    };

    if (!(await verifyPassword(user?.passwordHash ?? null, password)) || !user) return failed("login_failed", "INVALID_CREDENTIALS");

    // Checked only after the password, so none of these leak to someone guessing emails.
    if (user.bannedAt) {
      securityEvent(req, "banned_login", { userId: user.id });
      fail("BANNED");
    }
    if (user.breakUntil && user.breakUntil > new Date()) fail("ON_BREAK", { until: user.breakUntil.toISOString() });
    if (user.totpEnabled) {
      if (!code) fail("TOTP_REQUIRED");
      // Wrong codes count too, or a known password would allow guessing all 10^6 codes.
      const check = await consumeTotp(app, user, code);
      if (check !== "ok") return failed(check === "replayed" ? "totp_replayed" : "totp_failed", "TOTP_INVALID");
    }

    app.loginThrottle.clear(email);
    await startSession(app, req, reply, user.id);
    if (!user.shared) setDeviceCookie(req, reply, user.id);
    return { user: publicUser(user) };
  });

  // Who's signed in, if anyone. Never 401s, so the web app can call it on
  // start-up without error noise; a dead cookie is cleared on the way.
  app.get("/auth/session", async (req, reply) => {
    const found = await app.resolveSession(req);
    if (!found.ok && found.reason !== "none") clearSessionCookie(req, reply);
    return { user: found.ok ? publicUser(found.user) : null };
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    return publicUser(await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } }));
  });

  app.patch("/auth/me", { preHandler: [app.authenticate, app.denyShared] }, async (req) => {
    const data = parse(profileSchema, req.body);
    if (data.displayName) await assertNameNotShared(app, data.displayName, req.user.sub);
    return publicUser(await app.prisma.user.update({ where: { id: req.user.sub }, data }));
  });

  app.post(
    "/auth/password",
    { preHandler: [app.authenticate, app.denyShared], ...perMinute(app.limits.password) },
    async (req) => {
      const { currentPassword, newPassword } = parse(passwordSchema, req.body);
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
      if (!(await verifyPassword(user.passwordHash, currentPassword))) fail("CURRENT_PASSWORD_WRONG", { field: "currentPassword" });
      if (currentPassword === newPassword) fail("PASSWORD_UNCHANGED", { field: "newPassword" });

      await app.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
      // A new password signs out every other device.
      const signedOut = await revokeSessions(app, user.id, req.user.sid);
      return { ok: true, signedOut };
    }
  );
}
