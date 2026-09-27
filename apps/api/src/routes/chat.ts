import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CHAT_ROOMS, MAX_CHAT_LENGTH, moderateMessage, type ChatRoom } from "../lib/moderation.js";

const PAGE_SIZE = 50;
const REPEAT_WINDOW_MS = 30_000;
// Chat is ephemeral: older messages are dropped as new ones arrive.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const CHAT_CLOSED = { error: "Chat is paused on this demo right now.", code: "CHAT_CLOSED" };

const postSchema = z.object({ body: z.string().max(MAX_CHAT_LENGTH * 2) });
const listSchema = z.object({ after: z.string().datetime().optional() });

type MessageRow = {
  id: string;
  room: string;
  body: string;
  createdAt: Date;
  user: { id: string; displayName: string; avatar: string | null; ghostMode: boolean };
};

// Ghost mode hides the author from everyone except themselves.
function serialize(message: MessageRow, viewerId: string) {
  const mine = message.user.id === viewerId;
  const hidden = message.user.ghostMode && !mine;
  return {
    id: message.id,
    room: message.room,
    body: message.body,
    createdAt: message.createdAt,
    mine,
    user: hidden ? null : { id: message.user.id, displayName: message.user.displayName, avatar: message.user.avatar },
  };
}

const userSelect = { select: { id: true, displayName: true, avatar: true, ghostMode: true } };

export default async function chatRoutes(app: FastifyInstance) {
  const isRoom = (room: string): room is ChatRoom => (CHAT_ROOMS as readonly string[]).includes(room);

  // Polling-friendly: first call returns the latest page, then pass `after`
  // (the newest createdAt you have) to get only what's new.
  app.get("/chat/:room", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { room } = req.params as { room: string };
    if (!isRoom(room)) return reply.code(404).send({ error: "Unknown chat room" });
    const query = listSchema.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: query.error.flatten() });

    const after = query.data.after ? new Date(query.data.after) : null;
    const rows = after
      ? await app.prisma.chatMessage.findMany({
          where: { room, createdAt: { gt: after } },
          orderBy: { createdAt: "asc" },
          take: PAGE_SIZE,
          include: { user: userSelect },
        })
      : (
          await app.prisma.chatMessage.findMany({
            where: { room },
            orderBy: { createdAt: "desc" },
            take: PAGE_SIZE,
            include: { user: userSelect },
          })
        ).reverse();

    return { messages: rows.map((m) => serialize(m, req.user.sub)), open: app.features.chat };
  });

  app.post(
    "/chat/:room",
    { preHandler: [app.authenticate], config: { rateLimit: { max: app.limits.chat, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!app.features.chat) return reply.code(403).send(CHAT_CLOSED);
      const { room } = req.params as { room: string };
      if (!isRoom(room)) return reply.code(404).send({ error: "Unknown chat room" });
      const parsed = postSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "Message is too long" });

      const moderated = moderateMessage(parsed.data.body);
      if (!moderated.ok) return reply.code(400).send({ error: moderated.error });

      const repeat = await app.prisma.chatMessage.findFirst({
        where: {
          userId: req.user.sub,
          body: moderated.body,
          createdAt: { gt: new Date(Date.now() - REPEAT_WINDOW_MS) },
        },
      });
      if (repeat) return reply.code(400).send({ error: "Don't repeat yourself — wait a moment" });

      const message = await app.prisma.chatMessage.create({
        data: { room, userId: req.user.sub, body: moderated.body },
        include: { user: userSelect },
      });
      await app.prisma.chatMessage.deleteMany({ where: { room, createdAt: { lt: new Date(Date.now() - RETENTION_MS) } } });
      return reply.code(201).send({ message: serialize(message, req.user.sub) });
    }
  );
}
