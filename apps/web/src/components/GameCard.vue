<script setup lang="ts">
import { RouterLink } from "vue-router";
import type { Game } from "../stores/games";
import { useUiStore } from "../stores/ui";
import GameCover from "./GameCover.vue";
import Icon from "./Icon.vue";
import { t } from "../i18n";

defineProps<{ game: Game }>();
const ui = useUiStore();
</script>

<template>
  <div class="group relative">
    <RouterLink
      :to="{ name: 'play', params: { slug: game.slug } }"
      class="relative block aspect-[3/4] overflow-hidden rounded-lg bg-ink-700 shadow-card transition duration-300 will-change-transform group-hover:-translate-y-1.5 group-hover:shadow-lift"
      :aria-label="t('game.open', { title: game.title })"
    >
      <GameCover :title="game.title" :category="game.category" :provider="game.provider" />

      <span
        v-if="game.category === 'Live Casino'"
        class="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-red-500" /> {{ t("game.live") }}
      </span>
      <span
        v-else-if="game.category === 'Jackpots'"
        class="absolute left-2 top-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink-950"
      >
        {{ t("game.jackpot") }}
      </span>

      <span
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-950/40 opacity-0 transition duration-200 group-hover:opacity-100"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lift">
          <Icon name="play" :size="22" filled :stroke="0" />
        </span>
      </span>
    </RouterLink>

    <button
      type="button"
      class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur transition hover:bg-black/70 group-hover:-translate-y-1.5"
      :class="ui.isFavourite(game.slug) ? 'text-rose-400 opacity-100' : 'text-white opacity-0 group-hover:opacity-100 focus:opacity-100'"
      :aria-label="ui.isFavourite(game.slug) ? t('game.removeFavourite') : t('game.addFavourite')"
      @click="ui.toggleFavourite(game.slug)"
    >
      <Icon name="heart" :size="14" :filled="ui.isFavourite(game.slug)" />
    </button>
  </div>
</template>
