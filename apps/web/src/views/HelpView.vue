<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useUiStore } from "../stores/ui";
import { HELP } from "../i18n/help";
import { locale, t, tc } from "../i18n";
import Icon from "../components/Icon.vue";
import LanguageSwitch from "../components/LanguageSwitch.vue";
import Logo from "../components/Logo.vue";

const auth = useAuthStore();
const ui = useUiStore();

const query = ref("");
const selected = ref<string | null>(null);

const collections = computed(() => HELP[locale.value]);

const results = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return null;
  return collections.value.flatMap((c) =>
    c.articles
      .filter((a) => `${a.q} ${a.a}`.toLowerCase().includes(q))
      .map((a) => ({ ...a, collection: c.title, key: `${c.id}-${a.id}` }))
  );
});

const visible = computed(() =>
  selected.value ? collections.value.filter((c) => c.id === selected.value) : collections.value
);
</script>

<template>
  <div class="flex-1" :class="{ 'bg-ink-800': !auth.isAuthenticated }">
    <!-- Signed-out visitors get a minimal header instead of the casino shell. -->
    <header v-if="!auth.isAuthenticated" class="bg-ink-900 shadow-bar">
      <div class="page flex h-[60px] items-center justify-between gap-3">
        <Logo />
        <div class="flex items-center gap-3">
          <LanguageSwitch size="sm" />
          <RouterLink :to="{ name: 'login' }" class="btn-blue h-9 px-4">{{ t("auth.signIn") }}</RouterLink>
        </div>
      </div>
    </header>

    <div class="page space-y-8 py-6 sm:py-8">
      <section class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue to-[#0a3f86] p-6 text-center shadow-card sm:p-10">
        <div class="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <h1 class="relative text-2xl font-extrabold tracking-tight sm:text-3xl">{{ t("help.title") }}</h1>
        <p class="relative mt-1 text-sm text-white/80">{{ t("help.subtitle") }}</p>
        <div class="relative mx-auto mt-5 max-w-xl">
          <Icon name="search" :size="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            v-model="query"
            type="search"
            :placeholder="t('help.search')"
            :aria-label="t('help.search')"
            class="h-12 w-full rounded-full border-2 border-transparent bg-white pl-11 pr-4 text-sm font-semibold text-ink-900 placeholder:font-normal placeholder:text-slate-400 focus:border-white focus:outline-none"
          />
        </div>
      </section>

      <!-- Search results -->
      <section v-if="results" aria-live="polite">
        <p v-if="!results.length" class="panel px-6 py-10 text-center text-sm text-ink-300">{{ t("help.noResults", { query }) }}</p>
        <div v-else class="space-y-2">
          <details v-for="a in results" :key="a.key" class="panel group p-0" open>
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
              <span>{{ a.q }} <span class="ml-2 text-xs font-normal text-ink-400">{{ a.collection }}</span></span>
              <Icon name="chevron-down" :size="16" class="shrink-0 text-ink-300 transition group-open:rotate-180" />
            </summary>
            <p class="px-5 pb-4 text-sm leading-relaxed text-ink-300">{{ a.a }}</p>
          </details>
        </div>
      </section>

      <template v-else>
        <nav class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" :aria-label="t('help.title')">
          <button
            type="button"
            class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="selected === null ? 'bg-ink-600 text-white' : 'bg-ink-900 text-ink-300 hover:text-white'"
            @click="selected = null"
          >
            {{ t("help.all") }}
          </button>
          <button
            v-for="c in collections"
            :key="c.id"
            type="button"
            class="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="selected === c.id ? 'bg-ink-600 text-white' : 'bg-ink-900 text-ink-300 hover:text-white'"
            @click="selected = c.id"
          >
            <Icon :name="c.icon" :size="15" /> {{ c.title }}
          </button>
        </nav>

        <section v-for="c in visible" :key="c.id">
          <h2 class="mb-3 flex items-center gap-2 text-lg font-bold">
            <Icon :name="c.icon" :size="18" class="text-ink-300" /> {{ c.title }}
            <span class="text-sm font-semibold text-ink-400">· {{ tc("help.articles", c.articles.length) }}</span>
          </h2>
          <div class="space-y-2">
            <details v-for="a in c.articles" :key="a.id" class="panel group p-0">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">
                {{ a.q }}
                <Icon name="chevron-down" :size="16" class="shrink-0 text-ink-300 transition group-open:rotate-180" />
              </summary>
              <p class="px-5 pb-4 text-sm leading-relaxed text-ink-300">{{ a.a }}</p>
            </details>
          </div>
        </section>
      </template>

      <section class="panel flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><Icon name="chat" :size="22" /></span>
        <div class="flex-1">
          <p class="font-bold">{{ t("help.stillStuck") }}</p>
          <p class="text-sm text-ink-300">{{ t("help.askChat") }}</p>
        </div>
        <button v-if="auth.isAuthenticated" type="button" class="btn-accent" @click="ui.toggleChat(true)">{{ t("help.openChat") }}</button>
        <RouterLink v-else :to="{ name: 'login' }" class="btn-blue">{{ t("help.signInToChat") }}</RouterLink>
      </section>
    </div>
  </div>
</template>
