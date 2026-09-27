import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import hardeningPlugin from "./plugins/hardening.js";
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import referralRoutes from "./routes/referrals.js";
import gameRoutes from "./routes/games.js";
import securityRoutes from "./routes/security.js";
import chatRoutes from "./routes/chat.js";
import { FailureThrottle } from "./lib/throttle.js";
import { FEATURES, RATE_LIMITS, WEB_ORIGIN, trustProxySetting, type Features, type RateLimits, type TrustProxy } from "./config.js";

declare module "fastify" {
  interface FastifyInstance {
    limits: RateLimits;
    features: Features;
    loginThrottle: FailureThrottle;
  }
}

export interface AppOptions {
  logger?: boolean;
  limits?: Partial<RateLimits>;
  features?: Partial<Features>;
  trustProxy?: TrustProxy;
}

// Every request body here is a small JSON form; nothing needs more than this.
const BODY_LIMIT_BYTES = 16 * 1024;

// Builds the app without listening, so tests can drive it with app.inject().
export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({
    logger: opts.logger ?? true,
    bodyLimit: BODY_LIMIT_BYTES,
    trustProxy: opts.trustProxy ?? trustProxySetting(),
  });

  app.decorate("limits", { ...RATE_LIMITS, ...opts.limits });
  app.decorate("features", { ...FEATURES, ...opts.features });
  app.decorate("loginThrottle", new FailureThrottle(app.limits.loginFailures, 15 * 60_000));

  await app.register(hardeningPlugin);
  await app.register(cors, { origin: WEB_ORIGIN });
  // A generous per-IP backstop on every route; brute-forceable routes set
  // tighter limits through `config.rateLimit`.
  await app.register(rateLimit, {
    global: true,
    max: app.limits.global,
    timeWindow: "1 minute",
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too many attempts — try again in a minute.",
      retryAfterMs: context.ttl,
    }),
  });
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(authRoutes);
  await app.register(walletRoutes);
  await app.register(referralRoutes);
  await app.register(gameRoutes);
  await app.register(securityRoutes);
  await app.register(chatRoutes);

  app.get("/health", { config: { rateLimit: false } }, async () => ({ ok: true, demo: true }));

  // What the web app needs to know before showing a form (kill switches).
  app.get("/config", async () => ({
    registrationOpen: app.features.registration,
    chatOpen: app.features.chat,
  }));

  return app;
}
