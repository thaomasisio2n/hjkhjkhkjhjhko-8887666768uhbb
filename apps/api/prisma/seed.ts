import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
