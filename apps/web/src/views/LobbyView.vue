<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGamesStore, type Game } from "../stores/games";
import { useUiStore } from "../stores/ui";
import { sortCategories } from "../lib/categories";
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
const searchInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  games.fetchGames();
  if (typeof route.query.q === "string") query.value = route.query.q;
  if (ui.searchFocusTick) searchInput.value?.focus();
});

watch(
  () => ui.searchFocusTick,
  async () => {
    await nextTick();
    searchInput.value?.focus();
    searchInput.value?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
);

const categories = computed(() => sortCategories(Object.keys(games.byCategory)));

const tabs = computed<{ slug: string; label: string; icon: IconName }[]>(() => [
  { slug: "lobby", label: "Lobby", icon: "lobby" },
  ...categories.value.map((c) => ({ slug: c.slug, label: c.name, icon: c.icon })),
  { slug: "favourites", label: "Favourites", icon: "heart" },
  { slug: "recent", label: "Recent", icon: "history" },
]);

const tab = computed(() => {
  const t = String(route.query.tab ?? "lobby");
  return tabs.value.some((x) => x.slug === t) || !games.loaded ? t : "lobby";
});

const activeTab = computed(() => tabs.value.find((t) => t.slug === tab.value));

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

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return null;
  return games.games.filter((g) => `${g.title} ${g.provider} ${g.category}`.toLowerCase().includes(q));
});

function searchProvider(name: string) {
  query.value = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const promos: {
  tag: string;
  title: string;
  text: string;
  cta: string;
  emblem: Emblem;
  palette: Palette;
  action: () => void;
}[] = [
  {
    tag: "Welcome",
    title: "Your demo lobby is live",
    text: "Browse every slot and table with a simulated balance.",
    cta: "Browse slots",
    emblem: "star",
    palette: PALETTES.violet,
    action: () => setTab("slots"),
  },
  {
    tag: "Refer & Earn",
    title: "Invite friends, stack demo bonuses",
    text: "Share your link — you both get fake credits.",
    cta: "Get your link",
    emblem: "gift",
    palette: PALETTES.emerald,
    action: () => router.push({ name: "referrals" }),
  },
  {
    tag: "Instant",
    title: "One-click crypto top-ups",
    text: "Simulated BTC, ETH & USDT deposits for walkthroughs.",
    cta: "Open wallet",
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
        :key="promo.title"
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
            {{ promo.tag }}
          </span>
          <h3 class="mt-3 text-lg font-extrabold leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,.25)]">{{ promo.title }}</h3>
          <p class="mt-1 text-[13px] leading-snug text-white/80">{{ promo.text }}</p>
        </div>
        <button
          type="button"
          class="relative w-fit rounded-md border-2 border-white/80 px-4 py-1.5 text-sm font-bold transition hover:bg-white hover:text-ink-900"
          @click="promo.action"
        >
          {{ promo.cta }}
        </button>
      </article>
    </section>

    <!-- Search + tabs -->
    <section class="space-y-4">
      <div class="relative">
        <Icon name="search" :size="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-300" />
        <input
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="Search your game"
          class="h-12 w-full rounded-full border-2 border-ink-600 bg-ink-900 pl-11 pr-11 text-sm font-semibold text-white placeholder:font-normal placeholder:text-ink-400 transition hover:border-ink-500 focus:border-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          v-if="query"
          type="button"
          class="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-300 hover:bg-ink-700 hover:text-white"
          aria-label="Clear search"
          @click="query = ''"
        >
          <Icon name="x" :size="16" />
        </button>
      </div>

      <div class="no-scrollbar -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <div class="inline-flex gap-1 rounded-full bg-ink-900 p-1.5">
          <button
            v-for="t in tabs"
            :key="t.slug"
            type="button"
            class="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="tab === t.slug && !results ? 'bg-ink-600 text-white' : 'text-white hover:bg-ink-700'"
            @click="setTab(t.slug)"
          >
            <Icon :name="t.icon" :size="16" :class="tab === t.slug && !results ? 'text-white' : 'text-ink-300'" />
            {{ t.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Search results -->
    <section v-if="results">
      <h2 class="mb-4 text-base font-bold sm:text-lg">
        <span class="text-ink-300">Results for</span> &ldquo;{{ query }}&rdquo;
        <span class="ml-1 text-sm font-semibold text-ink-400">({{ results.length }})</span>
      </h2>
      <div v-if="results.length" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <GameCard v-for="game in results" :key="game.id" :game="game" />
      </div>
      <div v-else class="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
        <Icon name="search" :size="28" class="text-ink-400" />
        <p class="font-bold">No games found</p>
        <p class="text-sm text-ink-300">Try a different title or provider.</p>
      </div>
    </section>

    <!-- Lobby rows -->
    <template v-else-if="tab === 'lobby'">
      <GameRow
        v-if="recentGames.length"
        title="Continue playing"
        icon="history"
        :games="recentGames"
        @view-all="setTab('recent')"
      />
      <template v-if="!games.loaded">
        <GameRow v-for="n in 3" :key="n" title="Loading…" icon="grid" :games="[]" loading />
      </template>
      <GameRow
        v-for="cat in categories"
        :key="cat.slug"
        :title="cat.name"
        :icon="cat.icon"
        :games="games.byCategory[cat.name] ?? []"
        @view-all="setTab(cat.slug)"
      />

      <section v-if="games.providers.length">
        <h2 class="mb-3 flex items-center gap-2 text-base font-bold sm:text-lg">
          <Icon name="layers" :size="18" class="text-ink-300" /> Providers
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
            <span class="mt-1 text-xs font-semibold text-ink-400">{{ p.count }} games</span>
          </button>
        </div>
      </section>
    </template>

    <!-- Single tab grid -->
    <section v-else>
      <h2 class="mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
        <Icon v-if="activeTab" :name="activeTab.icon" :size="18" class="text-ink-300" />
        {{ activeTab?.label }}
        <span class="text-sm font-semibold text-ink-400">({{ tabGames.length }})</span>
      </h2>

      <div v-if="!games.loaded" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <div v-for="n in 12" :key="n" class="aspect-[3/4] animate-pulse rounded-lg bg-ink-700" />
      </div>
      <div v-else-if="tabGames.length" class="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 xl:grid-cols-6">
        <GameCard v-for="game in tabGames" :key="game.id" :game="game" />
      </div>
      <div v-else class="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
        <Icon :name="tab === 'favourites' ? 'heart' : 'history'" :size="28" class="text-ink-400" />
        <p class="font-bold">{{ tab === "favourites" ? "No favourites yet" : "Nothing played yet" }}</p>
        <p class="max-w-xs text-sm text-ink-300">
          {{
            tab === "favourites"
              ? "Tap the heart on any game to pin it here."
              : "Games you open will show up here for quick access."
          }}
        </p>
        <button type="button" class="btn-blue mt-3" @click="setTab('lobby')">Explore the lobby</button>
      </div>
    </section>
  </div>
</template>
