import type { FastifyInstance } from "fastify";
import { fail } from "../lib/http.js";

export default async function gameRoutes(app: FastifyInstance) {
  app.get("/games", async () => {
    const games = await app.prisma.game.findMany({ orderBy: { title: "asc" } });
    const byCategory = games.reduce<Record<string, typeof games>>((acc, g) => {
      (acc[g.category] ??= []).push(g);
      return acc;
    }, {});
    return { games, byCategory };
  });

  // Returns the iframe-launch shape a real game client would need. There is
  // no actual game build behind this in the demo — a separate placeholder
  // page explains that plainly.
  app.get("/games/:slug/launch", { preHandler: [app.authenticate] }, async (req) => {
    const { slug } = req.params as { slug: string };
    const game = await app.prisma.game.findUnique({ where: { slug: slug.slice(0, 100) } });
    if (!game) fail("GAME_NOT_FOUND");

    return {
      game,
      launch: {
        path: game.launchPath,
        mode: "demo",
        note: "Placeholder only — no real game client is wired up in this demo.",
      },
    };
  });
}
