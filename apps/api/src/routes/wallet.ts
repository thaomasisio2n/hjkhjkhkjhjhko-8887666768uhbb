import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DEPOSIT_LIMIT, MAX_BALANCE_CENTS, TOPUP, type WalletState } from "@novaspin/shared";
import { SHARED_ACCOUNT_BALANCE_CENTS } from "../config.js";
import { fail, parse, perMinute } from "../lib/http.js";
import { serialized } from "../lib/locks.js";

const topupSchema = z.object({
  amountCents: z.number().int().positive().max(TOPUP.maxCents),
  method: z.enum(TOPUP.methods).default("crypto_usdt"),
});

const limitsSchema = z.object({
  // null removes the limit
  depositLimitCents: z.number().int().min(DEPOSIT_LIMIT.minCents).max(DEPOSIT_LIMIT.maxCents).nullable(),
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

  async function walletState(userId: string): Promise<WalletState> {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return {
      balanceCents: user.balanceCents,
      depositLimitCents: user.depositLimitCents,
      depositedTodayCents: await depositedLast24h(userId),
    };
  }

  app.get("/wallet", async (req) => walletState(req.user.sub));

  // A limit on the shared demo account would block every other visitor's deposits.
  app.put("/wallet/limits", { preHandler: [app.denyShared] }, async (req) => {
    const { depositLimitCents } = parse(limitsSchema, req.body);
    await app.prisma.user.update({ where: { id: req.user.sub }, data: { depositLimitCents } });
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
  app.post("/wallet/topup", perMinute(app.limits.topup), async (req, reply) => {
    const { amountCents, method } = parse(topupSchema, req.body);
    const userId = req.user.sub;
    const shared = req.account.shared;

    // One top-up at a time per user, so parallel requests can't both slip
    // under the daily limit.
    const transaction = await serialized(`topup:${userId}`, async () => {
      const user = await app.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.depositLimitCents !== null) {
        const remaining = Math.max(0, user.depositLimitCents - (await depositedLast24h(userId)));
        if (amountCents > remaining) fail("DEPOSIT_LIMIT", { amountCents: remaining });
      }
      return app.prisma.$transaction(async (tx) => {
        // The cap is part of the UPDATE itself.
        const { count } = await tx.user.updateMany({
          where: { id: userId, balanceCents: { lte: MAX_BALANCE_CENTS - amountCents } },
          data: { balanceCents: { increment: amountCents } },
        });
        if (!count) {
          // One visitor filling the shared demo account to the cap mustn't
          // block everyone after them: it starts over from its seeded balance.
          if (!shared) fail("BALANCE_CAP", { amountCents: MAX_BALANCE_CENTS });
          await tx.user.update({ where: { id: userId }, data: { balanceCents: SHARED_ACCOUNT_BALANCE_CENTS + amountCents } });
        }
        return tx.transaction.create({
          data: { userId, type: "TOPUP", amountCents, note: `Demo top-up via ${method} (simulated, no real payment)` },
        });
      });
    });

    return reply.code(201).send({ ...(await walletState(userId)), transaction });
  });
}
