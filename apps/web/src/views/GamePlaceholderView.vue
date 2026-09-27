<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { api } from "../lib/api";

const route = useRoute();
const game = ref<any>(null);
const loading = ref(true);
const notFound = ref(false);

onMounted(async () => {
  try {
    const { data } = await api.get(`/games/${route.params.slug}/launch`);
    game.value = data.game;
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-10">
    <RouterLink to="/lobby" class="text-sm text-slate-400 hover:text-white">&larr; Back to lobby</RouterLink>

    <div v-if="loading" class="mt-6 text-slate-400 text-sm">Loading...</div>
    <div v-else-if="notFound" class="mt-6 text-red-400 text-sm">Game not found.</div>

    <div v-else class="mt-6 bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
      <div class="aspect-video bg-gradient-to-br from-surface-800 to-surface-950 flex flex-col items-center justify-center gap-3 text-center px-6">
        <span class="text-5xl">&#127920;</span>
        <p class="font-semibold">{{ game.title }}</p>
        <p class="text-slate-400 text-sm max-w-sm">
          This slot is a placeholder. In the real stack, a game client would be
          loaded here in an iframe at <code class="text-xs bg-surface-800 px-1.5 py-0.5 rounded">{{ game.launchPath }}</code>
          &mdash; that part is intentionally left for a separate game-integration
          pass and is not implemented in this demo.
        </p>
      </div>
      <div class="p-4 flex items-center justify-between text-sm">
        <span class="text-slate-400">{{ game.provider }} &middot; {{ game.category }}</span>
        <span class="text-xs bg-surface-800 border border-surface-700 rounded-full px-3 py-1">Demo mode</span>
      </div>
    </div>
  </div>
</template>
