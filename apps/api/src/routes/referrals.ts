import type { FastifyInstance } from "fastify";

export default async function referralRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get("/referrals", async (req) => {
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      include: {
        referrals: {
          select: { id: true, displayName: true, createdAt: true },
        },
      },
    });

    const bonusTransactions = await app.prisma.transaction.findMany({
      where: { userId: req.user.sub, type: "REFERRAL_BONUS" },
    });
    const totalEarnedCents = bonusTransactions.reduce((sum, t) => sum + t.amountCents, 0);

    return {
      referralCode: user.referralCode,
      referralLink: `https://your-demo-domain.example/register?ref=${user.referralCode}`,
      invited: user.referrals,
      totalEarnedCents,
    };
  });
}
