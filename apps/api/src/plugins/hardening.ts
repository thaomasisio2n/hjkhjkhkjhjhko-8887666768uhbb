import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance } from "fastify";

// The API only ever returns JSON, so it can use the strictest headers: no
// sniffing, no framing, no scripts, no referrers.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "cross-origin-opener-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export default fp(async (app: FastifyInstance) => {
  const production = process.env.NODE_ENV === "production";

  app.addHook("onSend", async (req, reply, payload) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) reply.header(name, value);
    // Browsers ignore HSTS over plain HTTP, so this only bites once served over TLS.
    if (production) reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
    // Nothing the API returns is safe to cache in a shared proxy.
    if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store");
    return payload;
  });

  // 4xx from Fastify itself (bad JSON, body too large, wrong content type) are
  // safe to explain; anything 5xx is logged and answered generically so stack
  // traces and database errors never reach the client.
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error({ err }, "request failed");
      return reply.code(status).send({ error: "Something went wrong on our side. Please try again." });
    }
    // The rate limiter throws its own 429 body; keep it.
    if (status === 429) return reply.code(429).send(err);
    return reply.code(status).send({ error: err.message, code: err.code });
  });

  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "Not found" }));
});
