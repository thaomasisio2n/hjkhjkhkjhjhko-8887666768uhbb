import type { FastifyInstance } from "fastify";
import { z } from "zod";

const topupSchema = z.object({
  amountCents: z.number().int().positive().max(100_000_000),
  method: z.enum(["crypto_btc", "crypto_eth", "crypto_usdt"]).default("crypto_usdt"),
});

export default async function walletRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/wallet", async (req) => {
    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    return { balanceCents: user.balanceCents };
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
  app.post("/wallet/topup", async (req, reply) => {
    const parsed = topupSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { amountCents, method } = parsed.data;

    const [, transaction] = await app.prisma.$transaction([
      app.prisma.user.update({
        where: { id: req.user.sub },
        data: { balanceCents: { increment: amountCents } },
      }),
      app.prisma.transaction.create({
        data: {
          userId: req.user.sub,
          type: "TOPUP",
          amountCents,
          note: `Demo top-up via ${method} (simulated, no real payment)`,
        },
      }),
    ]);

    const user = await app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    return reply.code(201).send({ balanceCents: user.balanceCents, transaction });
  });
}
