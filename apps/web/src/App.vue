<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useUiStore } from "./stores/ui";
import DemoBanner from "./components/layout/DemoBanner.vue";
import MobileNav from "./components/layout/MobileNav.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
import Topbar from "./components/layout/Topbar.vue";
import WalletModal from "./components/WalletModal.vue";

const route = useRoute();
const ui = useUiStore();

// Auth screens render full-bleed; everything else gets the casino shell.
const bare = computed(() => !route.meta.requiresAuth);
</script>

<template>
  <div v-if="bare" class="flex min-h-screen flex-col bg-ink-900">
    <DemoBanner />
    <router-view />
  </div>

  <div v-else class="flex min-h-screen">
    <Sidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <DemoBanner />
      <Topbar />
      <main class="flex-1">
        <router-view />
      </main>
      <SiteFooter class="pb-16 lg:pb-0" />
    </div>
    <MobileNav />
    <WalletModal v-if="ui.walletOpen" />
  </div>
</template>
