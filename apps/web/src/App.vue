<script setup lang="ts">
import { useAuthStore } from "./stores/auth";
import Navbar from "./components/Navbar.vue";

const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <div class="bg-amber-500/90 text-surface-950 text-xs sm:text-sm font-medium text-center py-1.5 px-4">
      DEMO EDUKACYJNE — brak prawdziwego hazardu, brak realnych p&#322;atno&#347;ci. Wszystkie
      &#347;rodki i gry s&#261; symulowane wy&#322;&#261;cznie do cel&oacute;w pokazowych.
    </div>
    <Navbar v-if="auth.isAuthenticated" />
    <main class="flex-1">
      <router-view />
    </main>
  </div>
</template>
