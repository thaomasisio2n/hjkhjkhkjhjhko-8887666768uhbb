import type { FastifyInstance, FastifyRequest } from "fastify";
import { SESSION_TTL_SECONDS } from "../config.js";

/** Creates a session row for this sign-in and returns a JWT bound to it. */
export async function startSession(app: FastifyInstance, userId: string, req: FastifyRequest) {
  // Rows past the token lifetime can never be used again; don't let them pile up
  // (the shared demo account gets a new one on every visitor's sign-in).
  await app.prisma.session.deleteMany({
    where: { userId, createdAt: { lt: new Date(Date.now() - SESSION_TTL_SECONDS * 1000) } },
  });
  const session = await app.prisma.session.create({
    data: {
      userId,
      userAgent: (req.headers["user-agent"] ?? "").slice(0, 300) || null,
      ip: req.ip ?? null,
    },
  });
  return app.jwt.sign({ sub: userId, sid: session.id });
}

export async function revokeSessions(app: FastifyInstance, userId: string, exceptSessionId?: string) {
  const { count } = await app.prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
  return count;
}
