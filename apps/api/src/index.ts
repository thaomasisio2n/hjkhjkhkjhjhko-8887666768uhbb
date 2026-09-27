import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import referralRoutes from "./routes/referrals.js";
import gameRoutes from "./routes/games.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
});
await app.register(prismaPlugin);
await app.register(authPlugin);

await app.register(authRoutes);
await app.register(walletRoutes);
await app.register(referralRoutes);
await app.register(gameRoutes);

app.get("/health", async () => ({ ok: true, demo: true }));

const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
