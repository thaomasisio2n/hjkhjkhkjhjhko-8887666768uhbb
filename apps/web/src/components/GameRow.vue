<script setup lang="ts">
import { ref } from "vue";
import type { Game } from "../stores/games";
import type { IconName } from "../lib/icons";
import GameCard from "./GameCard.vue";
import Icon from "./Icon.vue";
import { t } from "../i18n";

defineProps<{ title: string; icon: IconName; games: Game[]; loading?: boolean }>();
const emit = defineEmits<{ viewAll: [] }>();

const track = ref<HTMLElement | null>(null);

function scroll(dir: -1 | 1) {
  const el = track.value;
  if (!el) return;
  el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 text-base font-bold sm:text-lg">
        <Icon :name="icon" :size="18" class="text-ink-300" />
        {{ title }}
      </h2>
      <div class="flex items-center gap-1.5">
        <button type="button" class="hidden rounded-md px-3 py-1.5 text-xs font-semibold text-ink-300 transition hover:bg-ink-700 hover:text-white sm:block"
          @click="emit('viewAll')">
          {{ t("common.viewAll") }}
        </button>
        <div class="flex overflow-hidden rounded-full border-2 border-ink-600">
          <button type="button" class="flex h-7 w-9 items-center justify-center text-ink-300 transition hover:bg-ink-600 hover:text-white"
:aria-label="t('common.scrollLeft')" @click="scroll(-1)">
            <Icon name="chevron-left" :size="16" />
          </button>
          <span class="w-0.5 bg-ink-600" />
          <button type="button" class="flex h-7 w-9 items-center justify-center text-ink-300 transition hover:bg-ink-600 hover:text-white"
:aria-label="t('common.scrollRight')" @click="scroll(1)">
            <Icon name="chevron-right" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div ref="track" class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 pt-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
      <template v-if="loading">
        <div v-for="n in 8" :key="n" class="aspect-[3/4] w-[132px] shrink-0 animate-pulse rounded-lg bg-ink-700 sm:w-[150px] lg:w-[158px]" />
      </template>
      <GameCard v-for="game in games" v-else :key="game.id" :game="game" class="w-[132px] shrink-0 snap-start sm:w-[150px] lg:w-[158px]" />
    </div>
  </section>
</template>
