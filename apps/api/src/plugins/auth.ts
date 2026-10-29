import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Session, User } from "@prisma/client";
import { JWT_SECRET, SESSION_TTL_SECONDS } from "../config.js";
import { ApiError } from "../lib/http.js";
import { securityEvent } from "../lib/security-log.js";
import { clearSessionCookie, readSessionToken } from "../lib/session-cookie.js";

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler: requires a live session; sets req.user and req.account. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler after `authenticate`: refuses the shared demo accounts. */
    denyShared: (req: FastifyRequest) => Promise<void>;
    /** The live session behind the request's cookie, or why there isn't one. */
    resolveSession: (req: FastifyRequest) => Promise<SessionLookup>;
  }
  interface FastifyRequest {
    account: { shared: boolean };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; sid: string };
    user: { sub: string; sid: string };
  }
}

type SessionLookup =
  | { ok: true; session: Session; user: User; claims: { sub: string; sid: string } }
  | { ok: false; reason: "none" | "invalid" | "revoked" | "banned" }
  | { ok: false; reason: "on_break"; until: Date };

// Only touch lastSeenAt once a minute per session, not on every request.
const SEEN_THROTTLE_MS = 60_000;

export default fp(async (app: FastifyInstance) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { algorithm: "HS256", expiresIn: SESSION_TTL_SECONDS },
    // Pin the algorithm so a token can't pick its own (e.g. "none").
    verify: { algorithms: ["HS256"] },
  });

  app.decorateRequest("account", null as unknown as { shared: boolean });

  // Tokens are bound to a session row so they can be revoked (logout,
  // "sign out other devices", password change, break in play, bans).
  app.decorate("resolveSession", async (req: FastifyRequest): Promise<SessionLookup> => {
    const token = readSessionToken(req);
    if (!token) return { ok: false, reason: "none" };

    let claims: { sub: string; sid: string };
    try {
      claims = app.jwt.verify(token);
    } catch {
      return { ok: false, reason: "invalid" };
    }
    if (typeof claims.sub !== "string" || typeof claims.sid !== "string") return { ok: false, reason: "invalid" };

    const session = await app.prisma.session.findUnique({ where: { id: claims.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.userId !== claims.sub) return { ok: false, reason: "revoked" };
    if (session.user.bannedAt) return { ok: false, reason: "banned" };
    if (session.user.breakUntil && session.user.breakUntil > new Date()) {
      return { ok: false, reason: "on_break", until: session.user.breakUntil };
    }

    if (Date.now() - session.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
      await app.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    const { user, ...row } = session;
    return { ok: true, session: row, user, claims };
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const found = await app.resolveSession(req);
    if (!found.ok) {
      // A dead cookie is useless to keep around.
      if (found.reason !== "none") clearSessionCookie(req, reply);
      if (found.reason === "on_break") throw new ApiError("ON_BREAK", { until: found.until.toISOString() });
      throw new ApiError("UNAUTHORIZED");
    }
    req.user = found.claims;
    req.account = { shared: found.user.shared };
  });

  app.decorate("denyShared", async (req: FastifyRequest) => {
    if (!req.account?.shared) return;
    securityEvent(req, "shared_account_blocked", { route: req.routeOptions.url, method: req.method });
    throw new ApiError("SHARED_ACCOUNT");
  });
});
