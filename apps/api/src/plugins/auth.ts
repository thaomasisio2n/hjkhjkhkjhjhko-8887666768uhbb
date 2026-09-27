import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { JWT_SECRET } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; sid: string };
    user: { sub: string; sid: string };
  }
}

// Only touch lastSeenAt once a minute per session, not on every request.
const SEEN_THROTTLE_MS = 60_000;

export default fp(async (app: FastifyInstance) => {
  app.register(jwt, { secret: JWT_SECRET });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // Tokens are bound to a session row so they can be revoked (logout,
    // "sign out other devices", password change, break in play).
    const { sub, sid } = req.user;
    const session = sid
      ? await app.prisma.session.findUnique({ where: { id: sid }, include: { user: { select: { breakUntil: true } } } })
      : null;
    if (!session || session.revokedAt || session.userId !== sub) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (session.user.breakUntil && session.user.breakUntil > new Date()) {
      return reply.code(403).send({ error: "On a break", code: "ON_BREAK", until: session.user.breakUntil });
    }
    if (Date.now() - session.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
      await app.prisma.session.update({ where: { id: sid }, data: { lastSeenAt: new Date() } });
    }
  });
});
