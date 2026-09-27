<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "./stores/auth";
import { useUiStore } from "./stores/ui";
import DemoBanner from "./components/layout/DemoBanner.vue";
import MobileNav from "./components/layout/MobileNav.vue";
import Sidebar from "./components/layout/Sidebar.vue";
import SiteFooter from "./components/layout/SiteFooter.vue";
import Topbar from "./components/layout/Topbar.vue";
import RealityCheck from "./components/RealityCheck.vue";
import SearchOverlay from "./components/SearchOverlay.vue";
import ToastHost from "./components/ToastHost.vue";
import WalletModal from "./components/WalletModal.vue";

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

// Auth screens (and the 404) render full-bleed; everything else gets the casino shell.
const bare = computed(() => !route.meta.requiresAuth);

// "/" or Ctrl/Cmd+K opens search, unless the user is typing somewhere.
function onKey(e: KeyboardEvent) {
  if (bare.value || !auth.isAuthenticated || ui.searchOpen || ui.walletOpen) return;
  const target = e.target as HTMLElement | null;
  const typing = target?.closest("input, textarea, select, [contenteditable='true']");
  if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
    e.preventDefault();
    ui.openSearch();
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
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
        <router-view v-slot="{ Component, route: current }">
          <Transition name="page" mode="out-in">
            <component :is="Component" :key="current.path" />
          </Transition>
        </router-view>
      </main>
      <SiteFooter class="pb-16 lg:pb-0" />
    </div>
    <MobileNav />
    <WalletModal v-if="ui.walletOpen" />
    <SearchOverlay v-if="ui.searchOpen" />
    <RealityCheck />
  </div>

  <ToastHost />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.page-leave-to {
  opacity: 0;
}
</style>
