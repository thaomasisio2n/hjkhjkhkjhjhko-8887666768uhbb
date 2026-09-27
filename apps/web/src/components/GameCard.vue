<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Game } from "../stores/games";

defineProps<{ game: Game }>();
</script>

<template>
  <RouterLink
    :to="{ name: 'play', params: { slug: game.slug } }"
    class="group relative aspect-[3/4] rounded-xl overflow-hidden bg-surface-800 border border-surface-700 hover:border-brand-400 transition"
  >
    <div
      class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-700 to-surface-900 text-4xl"
    >
      &#127920;
    </div>
    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
      <span class="bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">Play demo</span>
    </div>
    <div class="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
      <p class="text-xs font-semibold truncate">{{ game.title }}</p>
      <p class="text-[10px] text-slate-400 truncate">{{ game.provider }}</p>
    </div>
  </RouterLink>
</template>
