<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Game } from "../stores/games";
import { tc } from "../i18n";
import GameCover from "./GameCover.vue";

defineProps<{ name: string; slug: string; count: number; games: Game[] }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'provider', params: { slug } }"
    class="group relative flex h-28 flex-col justify-between overflow-hidden rounded-lg bg-ink-700 p-4 shadow-card transition hover:-translate-y-1 hover:bg-ink-600"
  >
    <span class="text-lg font-black uppercase italic leading-tight tracking-tight text-ink-300 transition group-hover:text-white">{{ name }}</span>
    <span class="text-xs font-semibold text-ink-400">{{ tc("lobby.gamesCount", count) }}</span>
    <span class="pointer-events-none absolute -bottom-3 right-3 flex gap-1 opacity-80 transition group-hover:-translate-y-1 group-hover:opacity-100" aria-hidden="true">
      <span v-for="g in games.slice(0, 3)" :key="g.id" class="aspect-[3/4] w-9 overflow-hidden rounded shadow-card">
        <GameCover :title="g.title" :category="g.category" :show-title="false" />
      </span>
    </span>
  </RouterLink>
</template>
