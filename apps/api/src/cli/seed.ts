import { PrismaClient } from "@prisma/client";
import { REFERRAL_BONUS_CENTS, SHARED_ACCOUNT_BALANCE_CENTS, WELCOME_BONUS_CENTS } from "../config.js";
import { hashPassword } from "../lib/passwords.js";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@novaspin.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_BALANCE_CENTS = SHARED_ACCOUNT_BALANCE_CENTS; // $50,000 fake balance for a flashy demo

// A few fake friends invited by the demo account, so the referral dashboard
// has something to show on camera. They can log in with the demo password.
const DEMO_FRIENDS = [
  { email: "friend1@novaspin.test", displayName: "LuckyLuke", referralCode: "FRIEND01", avatar: "cherry-jungle", daysAgo: 12 },
  { email: "friend2@novaspin.test", displayName: "Marta W.", referralCode: "FRIEND02", avatar: "blossom-sakura", daysAgo: 5 },
  { email: "friend3@novaspin.test", displayName: "Kacper99", referralCode: "FRIEND03", avatar: "bolt-royal", daysAgo: 1 },
];

// Fictional studios and titles only — no real providers or games.
const catalog: { title: string; category: string; provider: string }[] = [
  // Slots
  { title: "Golden Vault Deluxe", category: "Slots", provider: "Nova Reels" },
  { title: "Mystic Fortune", category: "Slots", provider: "Cobalt Play" },
  { title: "Zeus Mobile Rush", category: "Slots", provider: "Ironclad Games" },
  { title: "Diamond Cascade", category: "Slots", provider: "Skyline Studios" },
  { title: "Wild Frontier Gold", category: "Slots", provider: "Pixel Forge" },
  { title: "Neon Reels", category: "Slots", provider: "Nova Reels" },
  { title: "Lucky Anchor", category: "Slots", provider: "Cobalt Play" },
  { title: "Emerald Tide", category: "Slots", provider: "Ironclad Games" },
  { title: "Volcano Spins", category: "Slots", provider: "Skyline Studios" },
  { title: "Frost Bite Bonanza", category: "Slots", provider: "Pixel Forge" },
  { title: "Sakura Fortune", category: "Slots", provider: "Nova Reels" },
  { title: "Thunder Storm Reels", category: "Slots", provider: "Cobalt Play" },
  { title: "Fruit Fiesta Blitz", category: "Slots", provider: "Pixel Forge" },
  { title: "Blazing Sevens", category: "Slots", provider: "Ironclad Games" },
  // Live Casino
  { title: "Starlight Roulette", category: "Live Casino", provider: "Aurora Live" },
  { title: "Mega Wheel", category: "Live Casino", provider: "Aurora Live" },
  { title: "Thunder Dice Live", category: "Live Casino", provider: "Aurora Live" },
  { title: "Velvet Baccarat Live", category: "Live Casino", provider: "Aurora Live" },
  { title: "Midnight Blackjack Live", category: "Live Casino", provider: "Aurora Live" },
  { title: "Fortune Wheel Live", category: "Live Casino", provider: "Skyline Studios" },
  { title: "Dragon Tiger Duel", category: "Live Casino", provider: "Aurora Live" },
  { title: "Royal Poker Live", category: "Live Casino", provider: "Cobalt Play" },
  { title: "Neon Bingo Live", category: "Live Casino", provider: "Nova Reels" },
  { title: "Treasure Hunt Live", category: "Live Casino", provider: "Aurora Live" },
  { title: "Sapphire Baccarat Live", category: "Live Casino", provider: "Skyline Studios" },
  { title: "Sic Bo Deluxe", category: "Live Casino", provider: "Aurora Live" },
  // Table Games
  { title: "Blackjack Prime", category: "Table Games", provider: "Pixel Forge" },
  { title: "Baccarat Royale", category: "Table Games", provider: "Ironclad Games" },
  { title: "European Roulette Classic", category: "Table Games", provider: "Pixel Forge" },
  { title: "Three Card Poker", category: "Table Games", provider: "Cobalt Play" },
  { title: "Casino Hold'em Pro", category: "Table Games", provider: "Pixel Forge" },
  { title: "Craps Classic", category: "Table Games", provider: "Ironclad Games" },
  { title: "French Roulette Noir", category: "Table Games", provider: "Skyline Studios" },
  { title: "Video Poker Deluxe", category: "Table Games", provider: "Nova Reels" },
  { title: "Mini Baccarat Squeeze", category: "Table Games", provider: "Cobalt Play" },
  { title: "Double Deck Blackjack", category: "Table Games", provider: "Pixel Forge" },
  // Jackpots
  { title: "Crimson Crown", category: "Jackpots", provider: "Ironclad Games" },
  { title: "Ancient Temple Riches", category: "Jackpots", provider: "Skyline Studios" },
  { title: "Pharaoh's Legacy", category: "Jackpots", provider: "Nova Reels" },
  { title: "Jungle King Jackpot", category: "Jackpots", provider: "Cobalt Play" },
  { title: "Pirate's Hoard", category: "Jackpots", provider: "Ironclad Games" },
  { title: "Mega Jewel Jackpot", category: "Jackpots", provider: "Skyline Studios" },
  { title: "Treasure Island Riches", category: "Jackpots", provider: "Pixel Forge" },
  { title: "King's Ransom Gold", category: "Jackpots", provider: "Nova Reels" },
  { title: "Volcano Jackpot Blaze", category: "Jackpots", provider: "Cobalt Play" },
  { title: "Starfall Millions", category: "Jackpots", provider: "Skyline Studios" },
  { title: "Lucky Sevens Jackpot", category: "Jackpots", provider: "Ironclad Games" },
  { title: "Frozen Fortune Vault", category: "Jackpots", provider: "Pixel Forge" },
];

async function main() {
  console.log("Seeding placeholder game catalog (no real games included)...");

  for (let i = 0; i < catalog.length; i++) {
    const { title, category, provider } = catalog[i];
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const launchPath = `/play/${provider.toLowerCase().replace(/\s+/g, "_")}:${slug}`;

    // Updating on re-seed keeps older local databases in sync with the catalog.
    await prisma.game.upsert({
      where: { slug },
      update: { title, provider, category, launchPath },
      create: {
        slug,
        title,
        provider,
        category,
        thumbnailUrl: `/placeholders/game-${(i % 8) + 1}.svg`,
        isPlaceholder: true,
        launchPath,
      },
    });
  }

  console.log(`Seeded ${catalog.length} placeholder games.`);

  const existingDemo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!existingDemo) {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash,
        displayName: "Demo Player",
        referralCode: "DEMO0001",
        balanceCents: DEMO_BALANCE_CENTS,
        transactions: {
          create: {
            type: "WELCOME_BONUS",
            amountCents: DEMO_BALANCE_CENTS,
            note: "Seeded demo account balance (fake, no real value)",
          },
        },
      },
    });
    console.log(`Seeded demo login -> email: ${DEMO_EMAIL} / password: ${DEMO_PASSWORD}`);
  } else {
    console.log(`Demo login already exists -> email: ${DEMO_EMAIL} / password: ${DEMO_PASSWORD}`);
  }

  const demo = await prisma.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
  let invited = 0;
  for (const friend of DEMO_FRIENDS) {
    if (await prisma.user.findUnique({ where: { email: friend.email } })) continue;

    const joinedAt = new Date(Date.now() - friend.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: friend.email,
          passwordHash: await hashPassword(DEMO_PASSWORD),
          displayName: friend.displayName,
          referralCode: friend.referralCode,
          avatar: friend.avatar,
          referredById: demo.id,
          balanceCents: WELCOME_BONUS_CENTS,
          createdAt: joinedAt,
          transactions: {
            create: {
              type: "WELCOME_BONUS",
              amountCents: WELCOME_BONUS_CENTS,
              note: "Demo welcome bonus, invited by Demo Player (fake balance, no real value)",
              createdAt: joinedAt,
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: demo.id },
        data: { balanceCents: { increment: REFERRAL_BONUS_CENTS } },
      }),
      prisma.transaction.create({
        data: {
          userId: demo.id,
          type: "REFERRAL_BONUS",
          amountCents: REFERRAL_BONUS_CENTS,
          note: `Referral bonus for inviting ${friend.displayName}`,
          createdAt: joinedAt,
        },
      }),
    ]);
    invited++;
  }
  console.log(invited ? `Seeded ${invited} demo referrals for the demo account.` : "Demo referrals already exist.");

  // These logins are published, so the API treats them as shared (settings
  // that could lock others out are read-only). Every seed run also puts them
  // back to their published state, in case anything changed before that
  // protection existed: password, profile, 2FA, breaks, limits.
  const sharedPasswordHash = await hashPassword(DEMO_PASSWORD);
  const sharedProfiles = [
    { email: DEMO_EMAIL, displayName: "Demo Player", avatar: null },
    ...DEMO_FRIENDS.map((f) => ({ email: f.email, displayName: f.displayName, avatar: f.avatar })),
  ];
  for (const profile of sharedProfiles) {
    await prisma.user.update({
      where: { email: profile.email },
      data: {
        shared: true,
        passwordHash: sharedPasswordHash,
        displayName: profile.displayName,
        avatar: profile.avatar,
        ghostMode: false,
        depositLimitCents: null,
        breakUntil: null,
        totpEnabled: false,
        totpSecret: null,
      },
    });
  }

  await seedChat();
}

// A few neutral opening messages so the chat rooms aren't empty on camera.
const CHAT_SEED: Record<string, [email: string, body: string, minutesAgo: number][]> = {
  en: [
    [DEMO_EMAIL, "Welcome to the NovaSpin demo chat! Be nice, and remember nothing here is real money.", 42],
    ["friend1@novaspin.test", "hey all 👋 the cover art on Sakura Fortune is really nice", 31],
    ["friend2@novaspin.test", "the Polish translation is great btw", 18],
    ["friend3@novaspin.test", "anyone else testing the streamer mode toggle? handy for recording", 6],
  ],
  pl: [
    ["friend3@novaspin.test", "siema! ktoś z Polski? 🙂", 25],
    ["friend2@novaspin.test", "hej, fajnie że jest polski pokój", 20],
    ["friend1@novaspin.test", "pamiętajcie, to tylko demo — żadnych prawdziwych pieniędzy", 9],
  ],
};

async function seedChat() {
  let created = 0;
  for (const [room, messages] of Object.entries(CHAT_SEED)) {
    if (await prisma.chatMessage.count({ where: { room } })) continue;
    for (const [email, body, minutesAgo] of messages) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.chatMessage.create({
        data: { room, userId: user.id, body, createdAt: new Date(Date.now() - minutesAgo * 60_000) },
      });
      created++;
    }
  }
  console.log(created ? `Seeded ${created} chat messages.` : "Chat rooms already have messages.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
