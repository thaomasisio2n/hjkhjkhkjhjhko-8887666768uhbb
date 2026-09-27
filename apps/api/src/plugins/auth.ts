import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { JWT_SECRET, SESSION_TTL_SECONDS } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Add after `authenticate` on routes the shared demo accounts may not use. */
    denyShared: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    /** Set by `authenticate`. */
    account: { shared: boolean };
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

export const SHARED_ACCOUNT_ERROR = {
  error: "This is the shared demo account, so this setting is locked. Create your own account to try it.",
  code: "SHARED_ACCOUNT",
};

export default fp(async (app: FastifyInstance) => {
  app.register(jwt, {
    secret: JWT_SECRET,
    sign: { algorithm: "HS256", expiresIn: SESSION_TTL_SECONDS },
    // Pin the algorithm so a token can't pick its own (e.g. "none").
    verify: { algorithms: ["HS256"] },
  });

  app.decorateRequest("account", null as unknown as { shared: boolean });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    // Tokens are bound to a session row so they can be revoked (logout,
    // "sign out other devices", password change, break in play, bans).
    const { sub, sid } = req.user;
    const session =
      typeof sid === "string"
        ? await app.prisma.session.findUnique({
            where: { id: sid },
            include: { user: { select: { breakUntil: true, bannedAt: true, shared: true } } },
          })
        : null;
    if (!session || session.revokedAt || session.userId !== sub || session.user.bannedAt) {
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (session.user.breakUntil && session.user.breakUntil > new Date()) {
      return reply.code(403).send({ error: "On a break", code: "ON_BREAK", until: session.user.breakUntil });
    }
    req.account = { shared: session.user.shared };
    if (Date.now() - session.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
      await app.prisma.session.update({ where: { id: sid }, data: { lastSeenAt: new Date() } });
    }
  });

  app.decorate("denyShared", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.account?.shared) return reply.code(403).send(SHARED_ACCOUNT_ERROR);
  });
});
