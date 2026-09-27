import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(40),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const WELCOME_BONUS_CENTS = Number(process.env.WELCOME_BONUS_CENTS ?? 1_000_000);
const REFERRAL_BONUS_CENTS = Number(process.env.REFERRAL_BONUS_CENTS ?? 500_000);

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, displayName, referralCode } = parsed.data;

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

    const user = await app.prisma.user.create({
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
            note: "Demo welcome bonus (fake balance, no real value)",
          },
        },
      },
    });

    if (referredBy) {
      await app.prisma.$transaction([
        app.prisma.user.update({
          where: { id: referredBy.id },
          data: { balanceCents: { increment: REFERRAL_BONUS_CENTS } },
        }),
        app.prisma.transaction.create({
          data: {
            userId: referredBy.id,
            type: "REFERRAL_BONUS",
            amountCents: REFERRAL_BONUS_CENTS,
            note: `Referral bonus for inviting ${displayName}`,
          },
        }),
      ]);
    }

    const token = app.jwt.sign({ sub: user.id });
    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        referralCode: user.referralCode,
        balanceCents: user.balanceCents,
      },
    });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({ sub: user.id });
    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        referralCode: user.referralCode,
        balanceCents: user.balanceCents,
      },
    });
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      referralCode: user.referralCode,
      balanceCents: user.balanceCents,
    };
  });
}
