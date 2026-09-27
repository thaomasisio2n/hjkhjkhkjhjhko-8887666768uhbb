import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@novaspin.test";
const DEMO_PASSWORD = "demo1234";
const DEMO_BALANCE_CENTS = 5_000_000; // $50,000 fake balance for a flashy demo

const providers = ["Nova Reels", "Cobalt Play", "Ironclad Games", "Skyline Studios"];
const categories = ["Slots", "Live Casino", "Table Games", "Jackpots"];

const titles = [
  "Golden Vault Deluxe", "Mystic Fortune", "Zeus Mobile Rush", "Crimson Crown",
  "Diamond Cascade", "Wild Frontier Gold", "Neon Reels", "Ancient Temple Riches",
  "Lucky Anchor", "Emerald Tide", "Volcano Spins", "Starlight Roulette",
  "Blackjack Prime", "Baccarat Royale", "Mega Wheel", "Pharaoh's Legacy",
  "Frost Bite Bonanza", "Jungle King Jackpot", "Pirate's Hoard", "Sakura Fortune",
];

async function main() {
  console.log("Seeding placeholder game catalog (no real games included)...");

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const provider = providers[i % providers.length];
    const category = categories[i % categories.length];

    await prisma.game.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        title,
        provider,
        category,
        thumbnailUrl: `/placeholders/game-${(i % 8) + 1}.svg`,
        isPlaceholder: true,
        launchPath: `/play/${provider.toLowerCase().replace(/\s+/g, "_")}:${slug}`,
      },
    });
  }

  console.log(`Seeded ${titles.length} placeholder games.`);

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
