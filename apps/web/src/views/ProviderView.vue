<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useGamesStore, type Game } from "../stores/games";
import { categoryLabel, categoryMeta, sortCategories } from "../lib/categories";
import { setTitle } from "../lib/title";
import { t, tc } from "../i18n";
import GameCard from "../components/GameCard.vue";
import Icon from "../components/Icon.vue";

const games = useGamesStore();
const route = useRoute();
onMounted(() => games.fetchGames());

const provider = computed(() => games.providers.find((p) => p.slug === route.params.slug));
const categories = computed(() => sortCategories([...new Set(provider.value?.games.map((g) => g.category) ?? [])]));
const sortBy = ref<"az" | "za" | "category">("az");

const sorted = computed<Game[]>(() => {
  const list = [...(provider.value?.games ?? [])];
  const byTitle = (a: Game, b: Game) => a.title.localeCompare(b.title);
  if (sortBy.value === "za") return list.sort((a, b) => byTitle(b, a));
  if (sortBy.value === "category") return list.sort((a, b) => a.category.localeCompare(b.category) || byTitle(a, b));
  return list.sort(byTitle);
});

watch(provider, (p) => p && setTitle(p.name), { immediate: true });
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <RouterLink :to="{ name: 'providers' }" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-300 transition hover:text-white">
      <Icon name="arrow-left" :size="16" /> {{ t("providers.all") }}
    </RouterLink>

    <div v-if="!games.loaded" class="h-32 animate-pulse rounded-xl bg-ink-700" />

    <div v-else-if="!provider" class="panel flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icon name="search" :size="28" class="text-ink-400" />
      <p class="font-bold">{{ t("providers.notFound") }}</p>
      <RouterLink :to="{ name: 'providers' }" class="btn-blue mt-3">{{ t("providers.all") }}</RouterLink>
    </div>

    <template v-else>
      <header class="relative overflow-hidden rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 p-6 shadow-card sm:p-8">
        <div class="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <h1 class="relative text-3xl font-black uppercase italic tracking-tight sm:text-4xl">{{ provider.name }}</h1>
        <p class="relative mt-1 text-sm font-semibold text-ink-300">{{ tc("lobby.gamesCount", provider.count) }}</p>
        <div class="relative mt-4 flex flex-wrap gap-2">
          <RouterLink
            v-for="c in categories"
            :key="c.slug"
            :to="{ name: 'lobby', query: { tab: c.slug } }"
            class="inline-flex items-center gap-1.5 rounded-full bg-ink-950/60 px-3 py-1.5 text-xs font-semibold text-ink-300 transition hover:text-white"
          >
            <Icon :name="categoryMeta(c.name).icon" :size="12" /> {{ categoryLabel(c.name) }}
          </RouterLink>
        </div>
      </header>

      <section>
        <div class="mb-4 flex justify-end">
          <label class="relative">
            <select v-model="sortBy" :aria-label="t('lobby.sortGames')"
              class="h-10 appearance-none rounded-md border-2 border-ink-600 bg-ink-900 pl-3 pr-9 text-sm font-semibold text-white transition hover:border-ink-500 focus:border-ink-400 focus:outline-none">
              <option value="az">{{ t("lobby.sortAz") }}</option>
              <option value="za">{{ t("lobby.sortZa") }}</option>
              <option value="category">{{ t("providers.sortCategory") }}</option>
            </select>
            <Icon name="chevron-down" :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
          </label>
        </div>
        <div class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
          <GameCard v-for="game in sorted" :key="game.id" :game="game" />
        </div>
      </section>
    </template>
  </div>
</template>
