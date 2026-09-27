import type { FastifyInstance } from "fastify";
import type { User } from "@prisma/client";
import type { PublicUser } from "@novaspin/shared";
import { fail } from "./http.js";
import { matchTotpStep } from "./totp.js";
import { foldName } from "./validation.js";

/** The one shape any endpoint returns for the signed-in user (never secrets). */
export function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    referralCode: user.referralCode,
    balanceCents: user.balanceCents,
    totpEnabled: user.totpEnabled,
    ghostMode: user.ghostMode,
    shared: user.shared,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Nobody gets to look like one of the published demo accounts. */
export async function assertNameNotShared(app: FastifyInstance, name: string, exceptUserId?: string) {
  const shared = await app.prisma.user.findMany({ where: { shared: true }, select: { id: true, displayName: true } });
  const folded = foldName(name);
  if (shared.some((u) => u.id !== exceptUserId && foldName(u.displayName) === folded)) fail("USERNAME_RESERVED", { field: "displayName" });
}

export type TotpCheck = "ok" | "invalid" | "replayed";

/**
 * Checks a 2FA code and burns its time step in the same UPDATE, so a code
 * seen once (shoulder-surfed, phished, logged) can't be used again, even by
 * two requests racing each other.
 */
export async function consumeTotp(app: FastifyInstance, user: Pick<User, "id" | "totpSecret">, code: string): Promise<TotpCheck> {
  const step = user.totpSecret ? matchTotpStep(user.totpSecret, code) : null;
  if (step === null) return "invalid";
  const { count } = await app.prisma.user.updateMany({
    where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step },
  });
  return count ? "ok" : "replayed";
}
