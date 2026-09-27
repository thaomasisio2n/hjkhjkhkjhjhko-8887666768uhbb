<script setup lang="ts">
import { onMounted } from "vue";
import { useGamesStore } from "../stores/games";
import GameCard from "../components/GameCard.vue";

const games = useGamesStore();

onMounted(() => {
  games.fetchGames();
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Game Lobby</h1>
      <p class="text-slate-400 text-sm mt-1">
        Placeholder catalog &mdash; real game clients aren't wired up in this demo.
      </p>
    </div>

    <section v-for="(list, category) in games.byCategory" :key="category" class="mb-10">
      <h2 class="text-lg font-semibold mb-3">{{ category }}</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <GameCard v-for="game in list" :key="game.id" :game="game" />
      </div>
    </section>
  </div>
</template>
