<script setup lang="ts">
import GameCover from "./GameCover.vue";
import Logo from "./Logo.vue";

defineProps<{ title: string; subtitle?: string }>();

// Decorative backdrop only — a fixed set of titles so the auth screens don't
// need the API to look alive.
const MOSAIC: [string, string][] = [
  ["Golden Vault Deluxe", "Slots"], ["Starlight Roulette", "Live Casino"], ["Zeus Mobile Rush", "Slots"],
  ["Crimson Crown", "Jackpots"], ["Blackjack Prime", "Table Games"], ["Diamond Cascade", "Slots"],
  ["Sakura Fortune", "Slots"], ["Mega Wheel", "Live Casino"], ["Volcano Spins", "Slots"],
  ["Pharaoh's Legacy", "Jackpots"], ["Frost Bite Bonanza", "Slots"], ["Baccarat Royale", "Table Games"],
  ["Emerald Tide", "Slots"], ["Mystic Fortune", "Slots"], ["Lucky Anchor", "Slots"],
  ["Neon Reels", "Slots"], ["Pirate's Hoard", "Jackpots"], ["Wild Frontier Gold", "Slots"],
  ["Jungle King Jackpot", "Jackpots"], ["Ancient Temple Riches", "Slots"], ["Golden Vault Deluxe", "Slots"],
  ["Crimson Crown", "Jackpots"], ["Diamond Cascade", "Slots"], ["Mega Wheel", "Live Casino"],
];
</script>

<template>
  <div class="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
    <div class="pointer-events-none absolute inset-0" aria-hidden="true">
      <div class="absolute -inset-[25%] grid rotate-[-10deg] grid-cols-4 gap-4 opacity-40 sm:grid-cols-6">
        <div v-for="([title, category], i) in MOSAIC" :key="i" class="aspect-[3/4] overflow-hidden rounded-xl">
          <GameCover :title="title" :category="category" />
        </div>
      </div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,33,46,.55)_0%,#0f212e_72%)]" />
    </div>

    <div class="relative w-full max-w-[420px] animate-pop-in rounded-xl bg-ink-800 p-6 shadow-lift sm:p-8">
      <div class="mb-6 flex flex-col items-center text-center">
        <Logo size="lg" />
        <h1 class="mt-5 text-xl font-extrabold">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 text-sm text-ink-300">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>
