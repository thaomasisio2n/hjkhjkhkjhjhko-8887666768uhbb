import type { FastifyInstance, FastifyRequest } from "fastify";

/** Creates a session row for this sign-in and returns a JWT bound to it. */
export async function startSession(app: FastifyInstance, userId: string, req: FastifyRequest) {
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
