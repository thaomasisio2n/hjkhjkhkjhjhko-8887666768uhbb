import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CHAT_MAX_LENGTH, CHAT_ROOMS, type ChatMessage, type ChatRoom } from "@novaspin/shared";
import { fail, parse, perMinute } from "../lib/http.js";
import { moderateMessage } from "../lib/moderation.js";

const PAGE_SIZE = 50;
const REPEAT_WINDOW_MS = 30_000;
// Chat is ephemeral: older messages are dropped as new ones arrive.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const roomSchema = z.object({ room: z.enum(CHAT_ROOMS, { message: "CHAT_ROOM_UNKNOWN" }) });
// Generous raw limit: whitespace is collapsed before the real length check.
const postSchema = z.object({ body: z.string().max(CHAT_MAX_LENGTH * 2, "CHAT_TOO_LONG") });
const listSchema = z.object({ after: z.string().datetime().optional() });

type MessageRow = {
  id: string;
  room: string;
  body: string;
  createdAt: Date;
  user: { id: string; displayName: string; avatar: string | null; ghostMode: boolean };
};

// Ghost mode hides the author from everyone except themselves.
function serialize(message: MessageRow, viewerId: string): ChatMessage {
  const mine = message.user.id === viewerId;
  const hidden = message.user.ghostMode && !mine;
  return {
    id: message.id,
    room: message.room as ChatRoom,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    mine,
    user: hidden ? null : { id: message.user.id, displayName: message.user.displayName, avatar: message.user.avatar },
  };
}

const withAuthor = { user: { select: { id: true, displayName: true, avatar: true, ghostMode: true } } };

export default async function chatRoutes(app: FastifyInstance) {
  // An unknown room is a 404, not a validation error.
  const roomOf = (params: unknown) => {
    const result = roomSchema.safeParse(params);
    return result.success ? result.data.room : fail("CHAT_ROOM_UNKNOWN");
  };

  // Polling-friendly: first call returns the latest page, then pass `after`
  // (the newest createdAt you have) to get only what's new.
  app.get("/chat/:room", { preHandler: [app.authenticate] }, async (req) => {
    const room = roomOf(req.params);
    const { after } = parse(listSchema, req.query);

    const rows = after
      ? await app.prisma.chatMessage.findMany({
          where: { room, createdAt: { gt: new Date(after) } },
          orderBy: { createdAt: "asc" },
          take: PAGE_SIZE,
          include: withAuthor,
        })
      : (
          await app.prisma.chatMessage.findMany({ where: { room }, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, include: withAuthor })
        ).reverse();

    return { messages: rows.map((m) => serialize(m, req.user.sub)), open: app.features.chat };
  });

  app.post("/chat/:room", { preHandler: [app.authenticate], ...perMinute(app.limits.chat) }, async (req, reply) => {
    if (!app.features.chat) fail("CHAT_CLOSED");
    const room = roomOf(req.params);
    const moderated = moderateMessage(parse(postSchema, req.body).body);
    if (!moderated.ok) fail(moderated.code);

    const repeat = await app.prisma.chatMessage.findFirst({
      where: { userId: req.user.sub, body: moderated.body, createdAt: { gt: new Date(Date.now() - REPEAT_WINDOW_MS) } },
      select: { id: true },
    });
    if (repeat) fail("CHAT_REPEAT");

    const message = await app.prisma.chatMessage.create({
      data: { room, userId: req.user.sub, body: moderated.body },
      include: withAuthor,
    });
    await app.prisma.chatMessage.deleteMany({ where: { room, createdAt: { lt: new Date(Date.now() - RETENTION_MS) } } });
    return reply.code(201).send({ message: serialize(message, req.user.sub) });
  });
}
