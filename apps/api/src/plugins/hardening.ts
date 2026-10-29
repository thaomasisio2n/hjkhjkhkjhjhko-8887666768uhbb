import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance } from "fastify";
import { WEB_ORIGIN } from "../config.js";
import { ApiError } from "../lib/http.js";
import { securityEvent } from "../lib/security-log.js";

// The API only ever returns JSON, so it can use the strictest headers: no
// sniffing, no framing, no scripts, no referrers.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default fp(async (app: FastifyInstance) => {
  const production = process.env.NODE_ENV === "production";

  // CSRF: the session cookie is SameSite=Strict already; on top of that, any
  // state-changing request a browser marks as coming from another site (or
  // another origin) is refused before it reaches a route. Requests without
  // these headers aren't from a browser page, so they can't carry a victim's
  // cookie by accident.
  app.addHook("onRequest", async (req) => {
    if (SAFE_METHODS.has(req.method)) return;
    const origin = req.headers.origin;
    const site = req.headers["sec-fetch-site"];
    const crossSite = (origin !== undefined && origin !== WEB_ORIGIN) || (site !== undefined && site !== "same-origin" && site !== "none");
    if (crossSite) {
      securityEvent(req, "cross_site_blocked", { origin, site, url: req.url });
      throw new ApiError("FORBIDDEN_ORIGIN");
    }
  });

  app.addHook("onSend", async (_req, reply, payload) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) reply.header(name, value);
    // Browsers ignore HSTS over plain HTTP, so this only bites once served over TLS.
    if (production) reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    // Nothing the API returns is safe to cache in a shared proxy.
    if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store");
    return payload;
  });

  // One place turns failures into bodies. Expected ones (ApiError) keep their
  // code; Fastify's own 4xx (bad JSON, body too large…) become INVALID_INPUT;
  // anything else is logged and answered generically, so stack traces and
  // database errors never reach the client.
  app.setErrorHandler((err: FastifyError | ApiError, req, reply) => {
    if (err instanceof ApiError) {
      if (err.code === "RATE_LIMITED") securityEvent(req, "rate_limited", { url: req.url });
      if (err.code === "SERVER_BUSY") securityEvent(req, "server_busy", { url: req.url });
      return reply.code(err.statusCode).send(err.toBody());
    }
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) {
      req.log.error({ err }, "request failed");
      return reply.code(500).send(new ApiError("INTERNAL").toBody());
    }
    return reply.code(status).send(new ApiError("INVALID_INPUT").toBody());
  });

  app.setNotFoundHandler((_req, reply) => reply.code(404).send(new ApiError("NOT_FOUND").toBody()));
});
