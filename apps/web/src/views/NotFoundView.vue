<script setup lang="ts">
import { RouterLink } from "vue-router";
import { PALETTES } from "../lib/gameArt";
import GameEmblem from "../components/GameEmblem.vue";
import Logo from "../components/Logo.vue";
</script>

<template>
  <div class="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
    <div class="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue/10 blur-3xl" />
    <Logo size="lg" class="relative mb-10" />
    <div class="relative flex items-center gap-1 sm:gap-3">
      <span class="text-[88px] font-black italic leading-none tracking-tight sm:text-[140px]">4</span>
      <GameEmblem class="h-24 w-24 sm:h-36 sm:w-36" emblem="chip" :palette="PALETTES.crimson" />
      <span class="text-[88px] font-black italic leading-none tracking-tight sm:text-[140px]">4</span>
    </div>
    <h1 class="relative mt-6 text-2xl font-extrabold">This table doesn't exist</h1>
    <p class="relative mt-2 max-w-sm text-sm text-ink-300">
      The page you're looking for was moved, removed, or never dealt in the first place.
    </p>
    <RouterLink :to="{ name: 'lobby' }" class="btn-accent relative mt-8 h-12 px-8 text-base">Back to the lobby</RouterLink>
  </div>
</template>
