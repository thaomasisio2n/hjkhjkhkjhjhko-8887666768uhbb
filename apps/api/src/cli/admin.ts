// Operator tools for a public showcase. There's no admin UI on purpose (no
// extra login to attack); run these where the database lives:
//   npm run admin -- <command>                          (local)
//   docker compose exec api node dist/cli/admin.js <command>   (Docker)
import { PrismaClient } from "@prisma/client";
import { MAX_BALANCE_CENTS } from "@novaspin/shared";

const HELP = `Usage: admin <command>

  ban <email>              Suspend an account: signs it out everywhere, deletes its
                           chat messages, refuses sign-in and hides it from referral lists.
  unban <email>            Lift a suspension.
  sessions:revoke <email>  Sign an account out on every device.
  sessions:revoke-all      Sign everyone out (e.g. after rotating JWT_SECRET).
  chat:recent [room] [n]   Show the latest n messages (default 20) with ids and authors.
  chat:delete <id>         Delete one chat message.
  chat:purge [room]        Delete every chat message (in one room, or all rooms).
  balance:set <email> <$>  Set a fake balance, e.g. after the shared demo hits the cap.
`;

const prisma = new PrismaClient();

async function userByEmail(email: string | undefined) {
  if (!email) throw new Error("An email is required.");
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new Error(`No account with email ${email}.`);
  return user;
}

async function run(command: string | undefined, args: string[]) {
  switch (command) {
    case "ban": {
      const user = await userByEmail(args[0]);
      const now = new Date();
      const [, sessions, messages] = await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { bannedAt: now } }),
        prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } }),
        prisma.chatMessage.deleteMany({ where: { userId: user.id } }),
      ]);
      return `Suspended ${user.email} ("${user.displayName}"): ${sessions.count} session(s) revoked, ${messages.count} chat message(s) deleted.`;
    }
    case "unban": {
      const user = await userByEmail(args[0]);
      await prisma.user.update({ where: { id: user.id }, data: { bannedAt: null } });
      return `Lifted the suspension on ${user.email}.`;
    }
    case "sessions:revoke": {
      const user = await userByEmail(args[0]);
      const { count } = await prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return `Revoked ${count} session(s) for ${user.email}.`;
    }
    case "sessions:revoke-all": {
      const { count } = await prisma.session.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } });
      return `Revoked ${count} session(s). Everyone has to sign in again.`;
    }
    case "chat:recent": {
      const [room, n] = args;
      const rows = await prisma.chatMessage.findMany({
        where: room ? { room } : {},
        orderBy: { createdAt: "desc" },
        take: Number(n ?? 20) || 20,
        include: { user: { select: { email: true, displayName: true } } },
      });
      return rows
        .reverse()
        .map((m) => `${m.id}  [${m.room}] ${m.createdAt.toISOString()}  ${m.user.displayName} <${m.user.email}>: ${m.body}`)
        .join("\n") || "No messages.";
    }
    case "chat:delete": {
      if (!args[0]) throw new Error("A message id is required (see chat:recent).");
      const { count } = await prisma.chatMessage.deleteMany({ where: { id: args[0] } });
      return count ? "Deleted." : "No message with that id.";
    }
    case "chat:purge": {
      const { count } = await prisma.chatMessage.deleteMany({ where: args[0] ? { room: args[0] } : {} });
      return `Deleted ${count} message(s).`;
    }
    case "balance:set": {
      const user = await userByEmail(args[0]);
      const cents = Math.round(Number(args[1]) * 100);
      if (!Number.isFinite(cents) || cents < 0 || cents > MAX_BALANCE_CENTS) {
        throw new Error(`Give an amount in dollars between 0 and ${MAX_BALANCE_CENTS / 100}.`);
      }
      await prisma.user.update({ where: { id: user.id }, data: { balanceCents: cents } });
      return `Set ${user.email}'s demo balance to $${(cents / 100).toFixed(2)}.`;
    }
    default:
      return HELP;
  }
}

try {
  const [command, ...args] = process.argv.slice(2);
  console.log(await run(command, args));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
