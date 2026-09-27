import type { FastifyInstance } from "fastify";
import { REFERRAL_BONUS_CENTS, WELCOME_BONUS_CENTS, normalizeReferralCode, referralLink } from "../config.js";
import { fail, perMinute } from "../lib/http.js";

const INVITED_PAGE = 100;

export default async function referralRoutes(app: FastifyInstance) {
  app.get("/referrals", { preHandler: [app.authenticate] }, async (req) => {
    // Suspended accounts drop off the list (they may have picked a vile name).
    const invitedWhere = { referredById: req.user.sub, bannedAt: null };
    const [user, invited, invitedCount, earned] = await Promise.all([
      app.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub }, select: { referralCode: true } }),
      app.prisma.user.findMany({
        where: invitedWhere,
        select: { id: true, displayName: true, avatar: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        // The shared demo code can collect a lot of sign-ups; the page shows the latest.
        take: INVITED_PAGE,
      }),
      app.prisma.user.count({ where: invitedWhere }),
      app.prisma.transaction.aggregate({
        where: { userId: req.user.sub, type: "REFERRAL_BONUS" },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      referralCode: user.referralCode,
      referralLink: referralLink(user.referralCode),
      invited,
      invitedCount,
      totalEarnedCents: earned._sum.amountCents ?? 0,
      bonusPerReferralCents: REFERRAL_BONUS_CENTS,
      welcomeBonusCents: WELCOME_BONUS_CENTS,
    };
  });

  // Public: lets the register page confirm a code and say who sent the invite.
  app.get("/referrals/lookup/:code", perMinute(app.limits.lookup), async (req) => {
    const code = normalizeReferralCode((req.params as { code: string }).code.slice(0, 32));
    const referrer = code
      ? await app.prisma.user.findUnique({ where: { referralCode: code }, select: { displayName: true, bannedAt: true } })
      : null;
    if (!referrer || referrer.bannedAt) fail("REFERRAL_NOT_FOUND");

    return { code, referrerName: referrer.displayName, welcomeBonusCents: WELCOME_BONUS_CENTS };
  });
}
