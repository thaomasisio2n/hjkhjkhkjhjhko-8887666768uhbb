<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useGamesStore } from "../stores/games";
import { useUiStore } from "../stores/ui";
import { categoryLabel, sortCategories } from "../lib/categories";
import { t, tc } from "../i18n";
import GameCard from "./GameCard.vue";
import Icon from "./Icon.vue";

const RESULT_LIMIT = 12;

const games = useGamesStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const query = ref("");
const input = ref<HTMLInputElement | null>(null);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return games.games.filter((g) =>
    `${g.title} ${g.provider} ${g.category} ${categoryLabel(g.category)}`.toLowerCase().includes(q)
  );
});

const categories = computed(() => sortCategories(Object.keys(games.byCategory)));

function close() {
  ui.searchOpen = false;
}

function viewAll() {
  ui.rememberSearch(query.value);
  router.push({ name: "lobby", query: { q: query.value.trim() } });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

// Any navigation (picking a game, a category, "view all") closes the overlay.
watch(() => route.fullPath, close);

onMounted(() => {
  games.fetchGames();
  input.value?.focus();
  window.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-ink-950/80 backdrop-blur-sm" @click.self="close">
    <div class="page pb-24 pt-4 sm:pt-[76px]" @click.self="close">
      <div role="dialog" aria-modal="true" :aria-label="t('nav.search')" class="animate-pop-in overflow-hidden rounded-xl bg-ink-800 shadow-lift">
        <form class="flex items-center gap-2 border-b border-ink-700 p-3" @submit.prevent="results.length && viewAll()">
          <div class="relative flex-1">
            <Icon name="search" :size="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              ref="input"
              v-model="query"
              type="search"
              :placeholder="t('lobby.searchPlaceholder')"
              :aria-label="t('search.label')"
              class="h-12 w-full rounded-full border-2 border-ink-600 bg-ink-950 pl-11 pr-4 text-sm font-semibold text-white placeholder:font-normal placeholder:text-ink-400 focus:border-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-700 hover:text-white"
:aria-label="t('search.close')" @click="close">
            <Icon name="x" :size="20" />
          </button>
        </form>

        <div class="p-4 sm:p-5">
          <!-- Empty query -->
          <div v-if="!query.trim()" class="space-y-6">
            <p class="text-center text-sm text-ink-300">{{ t("search.minChars") }}</p>

            <div v-if="ui.recentSearches.length">
              <div class="mb-2 flex items-center justify-between">
                <p class="text-sm font-bold">{{ t("search.recent") }}</p>
                <button type="button" class="text-xs font-semibold text-ink-300 hover:text-white" @click="ui.clearSearches()">
                  {{ t("search.clear", { count: ui.recentSearches.length }) }}
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="s in ui.recentSearches"
                  :key="s"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-ink-700 px-3 py-1.5 text-sm font-semibold transition hover:bg-ink-600"
                  @click="query = s"
                >
                  <Icon name="history" :size="14" class="text-ink-300" /> {{ s }}
                </button>
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-bold">{{ t("search.browse") }}</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <RouterLink
                  v-for="c in categories"
                  :key="c.slug"
                  :to="{ name: 'lobby', query: { tab: c.slug } }"
                  class="flex items-center gap-2.5 rounded-lg bg-ink-700 px-3 py-3 text-sm font-semibold transition hover:bg-ink-600"
                >
                  <Icon :name="c.icon" :size="18" class="text-ink-300" /> {{ categoryLabel(c.name) }}
                </RouterLink>
              </div>
            </div>
          </div>

          <!-- Results -->
          <div v-else-if="results.length">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-bold">
                {{ tc("search.results", results.length) }}
              </p>
              <button v-if="results.length > RESULT_LIMIT" type="button" class="text-xs font-semibold text-ink-300 hover:text-white" @click="viewAll">
                {{ t("common.viewAll") }}
              </button>
            </div>
            <div class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-6" @click.capture="ui.rememberSearch(query)">
              <GameCard v-for="game in results.slice(0, RESULT_LIMIT)" :key="game.id" :game="game" />
            </div>
          </div>

          <!-- No results -->
          <div v-else class="flex flex-col items-center gap-2 py-10 text-center">
            <Icon name="search" :size="28" class="text-ink-400" />
            <p class="font-bold">{{ t("search.noResults", { query }) }}</p>
            <p class="text-sm text-ink-300">{{ t("search.noResultsHint") }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
