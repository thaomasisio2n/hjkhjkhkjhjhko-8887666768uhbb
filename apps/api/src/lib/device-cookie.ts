import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { JWT_SECRET } from "../config.js";

// "Device cookies" (OWASP): after a successful sign-in the browser gets a
// long-lived, signed marker for that account. When an attacker trips the
// per-email throttle with wrong passwords, the real owner's browser still
// gets through, so the throttle can't be used to lock people out. It is
// not a session and grants nothing without the password.
const TTL_SECONDS = 90 * 24 * 60 * 60;
const KEY = createHmac("sha256", JWT_SECRET).update("novaspin/device-cookie/v1").digest();

const cookieName = (secure: boolean) => (secure ? "__Host-ns_device" : "ns_device");
const mac = (payload: string) => createHmac("sha256", KEY).update(payload).digest("base64url");

export function setDeviceCookie(req: FastifyRequest, reply: FastifyReply, userId: string) {
  const secure = req.server.secureCookies;
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + TTL_SECONDS}`;
  reply.setCookie(cookieName(secure), `${payload}.${mac(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

/** Whether this browser has signed in to `userId` before. */
export function isTrustedDevice(req: FastifyRequest, userId: string | undefined): boolean {
  const value = req.cookies[cookieName(req.server.secureCookies)];
  if (!userId || !value) return false;
  const [id, expires, signature] = value.split(".");
  if (id !== userId || !signature || Number(expires) < Date.now() / 1000) return false;
  const expected = Buffer.from(mac(`${id}.${expires}`));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
