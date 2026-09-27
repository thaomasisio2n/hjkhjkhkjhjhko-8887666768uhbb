import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import referralRoutes from "./routes/referrals.js";
import gameRoutes from "./routes/games.js";
import securityRoutes from "./routes/security.js";
import chatRoutes from "./routes/chat.js";
import { RATE_LIMITS, WEB_ORIGIN, type RateLimits } from "./config.js";

declare module "fastify" {
  interface FastifyInstance {
    limits: RateLimits;
  }
}

export interface AppOptions {
  logger?: boolean;
  limits?: Partial<RateLimits>;
}

// Builds the app without listening, so tests can drive it with app.inject().
export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? true });

  app.decorate("limits", { ...RATE_LIMITS, ...opts.limits });

  await app.register(cors, { origin: WEB_ORIGIN });
  // Opt-in per route via `config.rateLimit`; everything else is unlimited.
  await app.register(rateLimit, {
    global: false,
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

  app.get("/health", async () => ({ ok: true, demo: true }));

  return app;
}
