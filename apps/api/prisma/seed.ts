import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@novaspin.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_BALANCE_CENTS = 5_000_000; // $50,000 fake balance for a flashy demo

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
    const passwordHash = await argon2.hash(DEMO_PASSWORD);
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
