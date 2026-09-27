import type { FastifyInstance } from "fastify";
import { REFERRAL_BONUS_CENTS, WELCOME_BONUS_CENTS, normalizeReferralCode, referralLink } from "../config.js";

export default async function referralRoutes(app: FastifyInstance) {
  app.get("/referrals", { preHandler: [app.authenticate] }, async (req) => {
    const user = await app.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      include: {
        referrals: {
          select: { id: true, displayName: true, avatar: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const bonusTransactions = await app.prisma.transaction.findMany({
      where: { userId: req.user.sub, type: "REFERRAL_BONUS" },
    });
    const totalEarnedCents = bonusTransactions.reduce((sum, t) => sum + t.amountCents, 0);

    return {
      referralCode: user.referralCode,
      referralLink: referralLink(user.referralCode),
      invited: user.referrals,
      totalEarnedCents,
      bonusPerReferralCents: REFERRAL_BONUS_CENTS,
      welcomeBonusCents: WELCOME_BONUS_CENTS,
    };
  });

  // Public: lets the register page confirm a code and say who sent the invite.
  const lookupLimit = { config: { rateLimit: { max: app.limits.lookup, timeWindow: "1 minute" } } };
  app.get("/referrals/lookup/:code", lookupLimit, async (req, reply) => {
    const code = normalizeReferralCode((req.params as { code: string }).code);
    const referrer = code
      ? await app.prisma.user.findUnique({ where: { referralCode: code }, select: { displayName: true } })
      : null;
    if (!referrer) return reply.code(404).send({ error: "Referral code not found" });

    return { code, referrerName: referrer.displayName, welcomeBonusCents: WELCOME_BONUS_CENTS };
  });
}
