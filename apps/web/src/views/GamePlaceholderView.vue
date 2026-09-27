<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { api } from "../lib/api";
import { categoryMeta } from "../lib/categories";
import { setTitle } from "../lib/title";
import { useGamesStore, type Game } from "../stores/games";
import { useUiStore } from "../stores/ui";
import GameCover from "../components/GameCover.vue";
import GameRow from "../components/GameRow.vue";
import Icon from "../components/Icon.vue";
import Logo from "../components/Logo.vue";

const route = useRoute();
const router = useRouter();
const games = useGamesStore();
const ui = useUiStore();

const game = ref<Game | null>(null);
const loading = ref(true);
const notFound = ref(false);
const theatre = ref(false);
const splash = ref(true);
const stage = ref<HTMLElement | null>(null);

async function load(slug: string) {
  loading.value = true;
  notFound.value = false;
  try {
    const { data } = await api.get(`/games/${slug}/launch`);
    game.value = data.game;
    setTitle(data.game.title);
    ui.pushRecent(slug);
    // Launch splash, like a provider client booting; near-instant with reduced motion.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => (splash.value = false), reduced ? 150 : 1100);
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

// App keys routed views by path, so every game gets a fresh instance.
load(String(route.params.slug));
games.fetchGames();

const moreFromProvider = computed(() =>
  game.value ? games.games.filter((g) => g.provider === game.value!.provider && g.slug !== game.value!.slug) : []
);

function fullscreen() {
  stage.value?.requestFullscreen?.().catch(() => {});
}
</script>

<template>
  <div class="page py-6" :class="{ '!max-w-[1600px]': theatre }">
    <RouterLink :to="{ name: 'lobby' }" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-300 transition hover:text-white">
      <Icon name="arrow-left" :size="16" /> Lobby
    </RouterLink>

    <div v-if="loading && !game" class="mt-4 aspect-video animate-pulse rounded-xl bg-ink-700" />

    <div v-else-if="notFound" class="panel mt-4 flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icon name="search" :size="28" class="text-ink-400" />
      <p class="font-bold">Game not found</p>
      <p class="text-sm text-ink-300">It may have been removed from the demo catalog.</p>
      <RouterLink :to="{ name: 'lobby' }" class="btn-blue mt-3">Back to lobby</RouterLink>
    </div>

    <template v-else-if="game">
      <!-- Game frame -->
      <div class="mt-4 overflow-hidden rounded-xl bg-ink-900 shadow-lift">
        <div ref="stage" class="relative aspect-[4/5] overflow-hidden bg-ink-950 sm:aspect-video">
          <div class="absolute inset-0 scale-125 opacity-70 blur-2xl">
            <GameCover :title="game.title" :category="game.category" :show-title="false" />
          </div>
          <div class="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/50 to-ink-950/80" />

          <Transition leave-active-class="transition duration-300" leave-to-class="opacity-0">
            <div v-if="splash" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-ink-950 p-6" role="status">
              <div class="absolute inset-0 opacity-40 blur-3xl">
                <GameCover :title="game.title" :category="game.category" :show-title="false" />
              </div>
              <p class="relative text-2xl font-black uppercase italic tracking-tight text-white/90 sm:text-4xl">{{ game.provider }}</p>
              <div class="relative w-48 sm:w-64">
                <div class="h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div class="h-full origin-left animate-load-bar rounded-full bg-accent" />
                </div>
                <p class="mt-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Loading {{ game.title }}</p>
              </div>
              <Logo size="sm" class="pointer-events-none absolute bottom-5 opacity-50" />
            </div>
          </Transition>

          <div class="relative flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
            <div class="aspect-[3/4] w-28 overflow-hidden rounded-lg shadow-lift ring-1 ring-white/10 sm:w-36">
              <GameCover :title="game.title" :category="game.category" :provider="game.provider" />
            </div>
            <div>
              <h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">{{ game.title }}</h1>
              <p class="mt-1 text-sm font-semibold text-ink-300">{{ game.provider }}</p>
            </div>
            <div class="max-w-md rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-xs leading-relaxed text-ink-300 backdrop-blur sm:text-sm">
              <p class="mb-1 flex items-center justify-center gap-1.5 font-bold text-white">
                <Icon name="info" :size="15" class="text-amber-300" /> Game client not connected
              </p>
              In a full stack a provider's client would load here in an iframe at
              <code class="whitespace-nowrap rounded bg-ink-950 px-1.5 py-0.5 text-[11px] text-accent">{{ game.launchPath }}</code>.
              That integration is intentionally out of scope for this demo.
            </div>
          </div>
        </div>

        <!-- Control bar -->
        <div class="flex h-14 items-center justify-between gap-2 border-t border-ink-700 px-2 sm:px-4">
          <div class="flex items-center gap-1">
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-700 hover:text-white"
              title="Fullscreen" aria-label="Fullscreen" @click="fullscreen">
              <Icon name="maximize" :size="18" />
            </button>
            <button type="button" class="hidden h-10 w-10 items-center justify-center rounded-md transition hover:bg-ink-700 hover:text-white lg:flex"
              :class="theatre ? 'text-white' : 'text-ink-300'" title="Theatre mode" aria-label="Theatre mode" @click="theatre = !theatre">
              <Icon name="theatre" :size="18" />
            </button>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-md transition hover:bg-ink-700"
              :class="ui.isFavourite(game.slug) ? 'text-rose-400' : 'text-ink-300 hover:text-white'"
              :title="ui.isFavourite(game.slug) ? 'Remove from favourites' : 'Add to favourites'"
              :aria-label="ui.isFavourite(game.slug) ? 'Remove from favourites' : 'Add to favourites'"
              @click="ui.toggleFavourite(game.slug)">
              <Icon name="heart" :size="18" :filled="ui.isFavourite(game.slug)" />
            </button>
          </div>

          <Logo size="sm" class="pointer-events-none opacity-40" />

          <div class="flex items-center gap-2.5">
            <span class="text-xs font-semibold text-ink-300">Fun play</span>
            <span class="relative h-6 w-11 rounded-full bg-accent/90" aria-hidden="true">
              <span class="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow" />
            </span>
          </div>
        </div>
      </div>

      <!-- Details -->
      <section class="panel mt-6 grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:p-6">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-extrabold">{{ game.title }}</h2>
            <span class="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2.5 py-1 text-xs font-semibold text-ink-300">
              <Icon :name="categoryMeta(game.category).icon" :size="12" /> {{ game.category }}
            </span>
            <span class="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">Demo</span>
          </div>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
            {{ game.title }} is a placeholder entry in the NovaSpin demo catalog. It shows how a lobby lists a
            provider title, how the launch URL is shaped, and where the game client would sit &mdash; there is no game
            logic, RNG or wagering behind it.
          </p>
        </div>
        <dl class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-1">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-400">Provider</dt>
            <dd class="mt-0.5 font-bold">{{ game.provider }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-ink-400">Mode</dt>
            <dd class="mt-0.5 font-bold">Demo only</dd>
          </div>
        </dl>
      </section>

      <GameRow
        v-if="moreFromProvider.length"
        class="mt-8"
        :title="`More from ${game.provider}`"
        icon="layers"
        :games="moreFromProvider"
        @view-all="router.push({ name: 'lobby', query: { q: game.provider } })"
      />
    </template>
  </div>
</template>
