import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MAX_BALANCE_CENTS } from "../config.js";

const topupSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  method: z.enum(["crypto_btc", "crypto_eth", "crypto_usdt"]).default("crypto_usdt"),
});

const limitsSchema = z.object({
  // null removes the limit
  depositLimitCents: z.number().int().min(1_000).max(100_000_000).nullable(),
});

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function walletRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  // Deposits in the rolling 24h window the limit applies to.
  async function depositedLast24h(userId: string) {
    const { _sum } = await app.prisma.transaction.aggregate({
      where: { userId, type: "TOPUP", createdAt: { gte: new Date(Date.now() - DAY_MS) } },
      _sum: { amountCents: true },
    });
    return _sum.amountCents ?? 0;
  }

  async function walletState(userId: string) {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      balanceCents: user.balanceCents,
      depositLimitCents: user.depositLimitCents,
      depositedTodayCents: await depositedLast24h(userId),
    };
  }

  app.get("/wallet", async (req) => walletState(req.user.sub));

  // A limit on the shared demo account would block every other visitor's deposits.
  app.put("/wallet/limits", { preHandler: [app.denyShared] }, async (req, reply) => {
    const parsed = limitsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    await app.prisma.user.update({
      where: { id: req.user.sub },
      data: { depositLimitCents: parsed.data.depositLimitCents },
    });
    return walletState(req.user.sub);
  });

  app.get("/wallet/transactions", async (req) => {
    const transactions = await app.prisma.transaction.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { transactions };
  });

  // DEMO ONLY: there is no real crypto node or payment processor here.
  // "Paying" with any method just instantly credits the fake balance.
  app.post("/wallet/topup", { config: { rateLimit: { max: app.limits.topup, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = topupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { amountCents, method } = parsed.data;

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    if (user.depositLimitCents !== null) {
      const remaining = Math.max(0, user.depositLimitCents - (await depositedLast24h(user.id)));
      if (amountCents > remaining) {
        return reply.code(400).send({
          error: `Daily deposit limit reached — you can deposit up to $${(remaining / 100).toFixed(2)} more in the next 24 hours.`,
          code: "DEPOSIT_LIMIT",
          remainingCents: remaining,
        });
      }
    }

    // Checked in the same UPDATE, so parallel requests can't overshoot the cap.
    const transaction = await app.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: req.user.sub, balanceCents: { lte: MAX_BALANCE_CENTS - amountCents } },
        data: { balanceCents: { increment: amountCents } },
      });
      if (!count) return null;
      return tx.transaction.create({
        data: {
          userId: req.user.sub,
          type: "TOPUP",
          amountCents,
          note: `Demo top-up via ${method} (simulated, no real payment)`,
        },
      });
    });
    if (!transaction) {
      return reply.code(400).send({
        error: `Demo balances are capped at $${(MAX_BALANCE_CENTS / 100).toLocaleString("en-US")} — that's plenty of fake money.`,
        code: "BALANCE_CAP",
      });
    }

    return reply.code(201).send({ ...(await walletState(req.user.sub)), transaction });
  });
}
