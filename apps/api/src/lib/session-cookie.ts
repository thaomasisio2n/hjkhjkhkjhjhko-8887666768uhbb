import type { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_TTL_SECONDS } from "../config.js";

// The session token lives only in an httpOnly cookie: page scripts (and so
// any injected script) can never read it. SameSite=Strict keeps other sites
// from sending it. On an HTTPS site (see SECURE_COOKIES) it's Secure with
// the __Host- prefix, and only that name is read, so a sibling subdomain or
// a plain-HTTP response can't plant a session of its own.
const cookieName = (secure: boolean) => (secure ? "__Host-ns_session" : "ns_session");

export function setSessionCookie(req: FastifyRequest, reply: FastifyReply, token: string) {
  const secure = req.server.secureCookies;
  reply.setCookie(cookieName(secure), token, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: SESSION_TTL_SECONDS });
}

export function clearSessionCookie(req: FastifyRequest, reply: FastifyReply) {
  const secure = req.server.secureCookies;
  if (req.cookies[cookieName(secure)] !== undefined) reply.clearCookie(cookieName(secure), { path: "/", secure });
}

export function readSessionToken(req: FastifyRequest): string | undefined {
  return req.cookies[cookieName(req.server.secureCookies)];
}
