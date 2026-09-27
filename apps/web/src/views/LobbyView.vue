<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGamesStore, type Game } from "../stores/games";
import { useUiStore } from "../stores/ui";
import { categoryLabel, sortCategories } from "../lib/categories";
import { t, tc } from "../i18n";
import { setTitle } from "../lib/title";
import { PALETTES, type Emblem, type Palette } from "../lib/gameArt";
import type { IconName } from "../lib/icons";
import GameCard from "../components/GameCard.vue";
import GameEmblem from "../components/GameEmblem.vue";
import GameRow from "../components/GameRow.vue";
import Icon from "../components/Icon.vue";

const games = useGamesStore();
const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const query = ref("");

onMounted(() => games.fetchGames());

// "View all" from the search overlay (or a provider link) arrives as ?q=.
watch(
  () => route.query.q,
  (q) => {
    if (typeof q === "string") query.value = q;
  },
  { immediate: true }
);

const categories = computed(() => sortCategories(Object.keys(games.byCategory)));

const tabs = computed<{ slug: string; label: string; icon: IconName }[]>(() => [
  { slug: "lobby", label: t("nav.lobby"), icon: "lobby" },
  ...categories.value.map((c) => ({ slug: c.slug, label: categoryLabel(c.name), icon: c.icon })),
  { slug: "favourites", label: t("nav.favourites"), icon: "heart" },
  { slug: "recent", label: t("nav.recent"), icon: "history" },
]);

const tab = computed(() => {
  const t = String(route.query.tab ?? "lobby");
  return tabs.value.some((x) => x.slug === t) || !games.loaded ? t : "lobby";
});

const activeTab = computed(() => tabs.value.find((x) => x.slug === tab.value));

// Guarded by route name: during the leave transition this view still reacts to
// the next route, and must not overwrite that page's title.
watch(
  activeTab,
  (active) => {
    if (route.name === "lobby") setTitle(active && active.slug !== "lobby" ? active.label : t("titles.casino"));
  },
  { immediate: true }
);

function setTab(slug: string) {
  query.value = "";
  router.replace({ name: "lobby", query: slug === "lobby" ? {} : { tab: slug } });
}

const lookup = (slugs: string[]) => slugs.map((s) => games.bySlug(s)).filter((g): g is Game => !!g);

const recentGames = computed(() => lookup(ui.recent));

const tabGames = computed<Game[]>(() => {
  if (tab.value === "favourites") return lookup(ui.favourites);
  if (tab.value === "recent") return recentGames.value;
  const cat = categories.value.find((c) => c.slug === tab.value);
  return cat ? games.byCategory[cat.name] ?? [] : [];
});

// Category grids get a provider filter + sort; favourites/recent keep their own order.
type SortKey = "az" | "za" | "provider";
const providerFilter = ref("");
const sortBy = ref<SortKey>("az");
watch(tab, () => (providerFilter.value = ""));

const isCategoryTab = computed(() => categories.value.some((c) => c.slug === tab.value));
const tabProviders = computed(() => [...new Set(tabGames.value.map((g) => g.provider))].sort());

const gridGames = computed(() => {
  if (!isCategoryTab.value) return tabGames.value;
  const list = providerFilter.value ? tabGames.value.filter((g) => g.provider === providerFilter.value) : [...tabGames.value];
  const byTitle = (a: Game, b: Game) => a.title.localeCompare(b.title);
  if (sortBy.value === "za") return list.sort((a, b) => byTitle(b, a));
  if (sortBy.value === "provider") return list.sort((a, b) => a.provider.localeCompare(b.provider) || byTitle(a, b));
  return list.sort(byTitle);
});

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return null;
  return games.games.filter((g) =>
    `${g.title} ${g.provider} ${g.category} ${categoryLabel(g.category)}`.toLowerCase().includes(q)
  );
});

function searchProvider(name: string) {
  query.value = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Copy lives in the i18n dictionaries under promos.<id>.
const promos: {
  id: "welcome" | "refer" | "instant";
  emblem: Emblem;
  palette: Palette;
  action: () => void;
}[] = [
  {
    id: "welcome",
    emblem: "star",
    palette: PALETTES.violet,
    action: () => setTab("slots"),
  },
  {
    id: "refer",
    emblem: "gift",
    palette: PALETTES.emerald,
    action: () => router.push({ name: "referrals" }),
  },
  {
    id: "instant",
    emblem: "coin",
    palette: PALETTES.gold,
    action: () => ui.openWallet(),
  },
];
</script>

<template>
  <div class="page space-y-8 py-6 sm:py-8">
    <!-- Promo banners -->
    <section
      v-if="tab === 'lobby' && !results"
      class="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
    >
      <article
        v-for="promo in promos"
        :key="promo.id"
        class="relative flex h-[190px] min-w-[86%] snap-start flex-col justify-between overflow-hidden rounded-xl p-5 shadow-card sm:min-w-[55%] lg:min-w-0"
        :style="{ background: `linear-gradient(135deg, ${promo.palette[1]} 0%, ${promo.palette[2]} 85%)` }"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]"
        />
        <div class="pointer-events-none absolute -bottom-6 -right-6 h-[170px] w-[170px] rotate-[-8deg]">
          <div class="absolute inset-6 rounded-full bg-white/25 blur-2xl" />
          <GameEmblem class="relative h-full w-full" :emblem="promo.emblem" :palette="promo.palette" />
        </div>

        <div class="relative max-w-[62%]">
          <span class="inline-block rounded bg-white px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-900">
            {{ t(`promos.${promo.id}.tag`) }}
          </span>
          <h3 class="mt-3 text-lg font-extrabold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,.25)]">{{ t(`promos.${promo.id}.title`) }}</h3>
          <p class="mt-1 text-[13px] leading-snug text-white/80">{{ t(`promos.${promo.id}.text`) }}</p>
        </div>
        <button
          type="button"
          class="relative w-fit rounded-md border-2 border-white/80 px-4 py-1.5 text-sm font-bold transition hover:bg-white hover:text-ink-900"
          @click="promo.action"
        >
          {{ t(`promos.${promo.id}.cta`) }}
        </button>
      </article>
    </section>

    <!-- Search + tabs -->
    <section class="space-y-4">
      <div class="relative">
        <Icon name="search" :size="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          v-model="query"
          type="search"
          :placeholder="t('lobby.searchPlaceholder')"
          class="h-12 w-full rounded-full border-2 border-ink-600 bg-ink-900 pl-11 pr-11 text-sm font-semibold text-white placeholder:font-normal placeholder:text-ink-400 transition hover:border-ink-500 focus:border-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          v-if="query"
          type="button"
          class="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 hover:bg-ink-700 hover:text-white"
          :aria-label="t('common.clearSearch')"
          @click="query = ''"
        >
          <Icon name="x" :size="16" />
        </button>
      </div>

      <div class="no-scrollbar -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div class="inline-flex gap-1 rounded-full bg-ink-900 p-1.5">
          <button
            v-for="item in tabs"
            :key="item.slug"
            type="button"
            class="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="tab === item.slug && !results ? 'bg-ink-600 text-white' : 'text-white hover:bg-ink-700'"
            @click="setTab(item.slug)"
          >
            <Icon :name="item.icon" :size="16" :class="tab === item.slug && !results ? 'text-white' : 'text-ink-300'" />
            {{ item.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Search results -->
    <section v-if="results">
      <h2 class="mb-4 text-base font-bold sm:text-lg">
        <span class="text-ink-300">{{ t("lobby.resultsFor") }}</span> &ldquo;{{ query }}&rdquo;
        <span class="ml-1 text-sm font-semibold text-ink-400">({{ results.length }})</span>
      </h2>
      <div v-if="results.length" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <GameCard v-for="game in results" :key="game.id" :game="game" />
      </div>
      <div v-else class="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
        <Icon name="search" :size="28" class="text-ink-400" />
        <p class="font-bold">{{ t("lobby.noGames") }}</p>
        <p class="text-sm text-ink-300">{{ t("lobby.noGamesHint") }}</p>
      </div>
    </section>

    <!-- Lobby rows -->
    <template v-else-if="tab === 'lobby'">
      <GameRow
        v-if="recentGames.length"
        :title="t('lobby.continuePlaying')"
        icon="history"
        :games="recentGames"
        @view-all="setTab('recent')"
      />
      <template v-if="!games.loaded">
        <GameRow v-for="n in 3" :key="n" :title="t('common.loading')" icon="grid" :games="[]" loading />
      </template>
      <GameRow
        v-for="cat in categories"
        :key="cat.slug"
        :title="categoryLabel(cat.name)"
        :icon="cat.icon"
        :games="games.byCategory[cat.name] ?? []"
        @view-all="setTab(cat.slug)"
      />

      <section v-if="games.providers.length">
        <h2 class="mb-3 flex items-center gap-2 text-base font-bold sm:text-lg">
          <Icon name="layers" :size="18" class="text-ink-300" /> {{ t("lobby.providers") }}
        </h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <button
            v-for="p in games.providers"
            :key="p.name"
            type="button"
            class="group flex h-24 flex-col items-center justify-center rounded-lg bg-ink-700 shadow-card transition hover:-translate-y-1 hover:bg-ink-600"
            @click="searchProvider(p.name)"
          >
            <span class="text-lg font-black uppercase italic tracking-tight text-ink-300 transition group-hover:text-white">
              {{ p.name }}
            </span>
            <span class="mt-1 text-xs font-semibold text-ink-400">{{ tc("lobby.gamesCount", p.count) }}</span>
          </button>
        </div>
      </section>
    </template>

    <!-- Single tab grid -->
    <section v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 text-base font-bold sm:text-lg">
          <Icon v-if="activeTab" :name="activeTab.icon" :size="18" class="text-ink-300" />
          {{ activeTab?.label }}
          <span class="text-sm font-semibold text-ink-400">({{ gridGames.length }})</span>
        </h2>
        <div v-if="isCategoryTab && games.loaded" class="flex w-full gap-2 sm:w-auto">
          <label class="relative flex-1 sm:flex-none">
            <select v-model="providerFilter" :aria-label="t('lobby.filterProvider')" class="h-10 w-full appearance-none rounded-md border-2 border-ink-600 bg-ink-900 pl-3 pr-9 text-sm font-semibold text-white transition hover:border-ink-500 focus:border-ink-400 focus:outline-none sm:w-48">
              <option value="">{{ t("lobby.allProviders") }}</option>
              <option v-for="p in tabProviders" :key="p" :value="p">{{ p }}</option>
            </select>
            <Icon name="chevron-down" :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
          </label>
          <label class="relative flex-1 sm:flex-none">
            <select v-model="sortBy" :aria-label="t('lobby.sortGames')" class="h-10 w-full appearance-none rounded-md border-2 border-ink-600 bg-ink-900 pl-3 pr-9 text-sm font-semibold text-white transition hover:border-ink-500 focus:border-ink-400 focus:outline-none sm:w-40">
              <option value="az">{{ t("lobby.sortAz") }}</option>
              <option value="za">{{ t("lobby.sortZa") }}</option>
              <option value="provider">{{ t("lobby.sortProvider") }}</option>
            </select>
            <Icon name="chevron-down" :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
          </label>
        </div>
      </div>

      <div v-if="!games.loaded" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <div v-for="n in 12" :key="n" class="aspect-[3/4] animate-pulse rounded-lg bg-ink-700" />
      </div>
      <div v-else-if="gridGames.length" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <GameCard v-for="game in gridGames" :key="game.id" :game="game" />
      </div>
      <div v-else class="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
        <Icon :name="tab === 'favourites' ? 'heart' : 'history'" :size="28" class="text-ink-400" />
        <p class="font-bold">{{ tab === "favourites" ? t("lobby.noFavourites") : t("lobby.noRecent") }}</p>
        <p class="max-w-xs text-sm text-ink-300">
          {{
            tab === "favourites"
              ? t("lobby.noFavouritesHint")
              : t("lobby.noRecentHint")
          }}
        </p>
        <button type="button" class="btn-blue mt-3" @click="setTab('lobby')">{{ t("lobby.explore") }}</button>
      </div>
    </section>
  </div>
</template>
