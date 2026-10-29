<script setup lang="ts">
import { onMounted } from "vue";
import { useGamesStore } from "../stores/games";
import { t } from "../i18n";
import Icon from "../components/Icon.vue";
import ProviderCard from "../components/ProviderCard.vue";

const games = useGamesStore();
onMounted(() => games.fetchGames());
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <header>
      <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Icon name="layers" :size="22" class="text-ink-300" /> {{ t("providers.title") }}
      </h1>
      <p class="mt-1 text-sm text-ink-300">{{ t("providers.subtitle") }}</p>
    </header>
    <div v-if="!games.loaded" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div v-for="n in 6" :key="n" class="h-28 animate-pulse rounded-lg bg-ink-700" />
    </div>
    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <ProviderCard v-for="p in games.providers" :key="p.slug" v-bind="p" />
    </div>
  </div>
</template>
