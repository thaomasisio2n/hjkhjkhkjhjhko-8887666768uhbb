<script setup lang="ts">
import { watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useUiStore } from "../../stores/ui";
import Icon from "../Icon.vue";
import Logo from "../Logo.vue";
import SidebarNav from "./SidebarNav.vue";

const ui = useUiStore();
const route = useRoute();

watch(
  () => route.fullPath,
  () => (ui.mobileNavOpen = false)
);
</script>

<template>
  <!-- Desktop -->
  <aside
    class="sticky top-0 z-20 hidden h-screen shrink-0 flex-col bg-ink-900 shadow-bar transition-[width] duration-200 lg:flex"
    :class="ui.sidebarCollapsed ? 'w-[72px]' : 'w-60'"
  >
    <div class="flex h-[60px] shrink-0 items-center gap-2 px-3 shadow-bar">
      <button
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-700 hover:text-white"
        :aria-label="ui.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="ui.toggleSidebar()"
      >
        <Icon name="menu" :size="20" />
      </button>
      <RouterLink
        v-if="!ui.sidebarCollapsed"
        to="/lobby"
        class="relative flex h-10 flex-1 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-blue to-[#0a3f86] text-sm font-extrabold uppercase tracking-wide shadow-card transition hover:brightness-110"
      >
        <span class="absolute -right-2 -top-3 text-white/15"><Icon name="cherry" :size="44" /></span>
        <span class="relative">Casino</span>
      </RouterLink>
    </div>

    <div class="no-scrollbar flex-1 overflow-y-auto p-3">
      <SidebarNav :collapsed="ui.sidebarCollapsed" />
    </div>

    <div v-if="!ui.sidebarCollapsed" class="p-3">
      <div class="flex gap-2.5 rounded-md bg-ink-800 p-3 text-xs leading-relaxed text-ink-300">
        <Icon name="shield" :size="16" class="mt-0.5 text-amber-300" />
        <p><span class="font-bold text-white">Demo build.</span> Simulated balances only &mdash; nothing here has real value.</p>
      </div>
    </div>
  </aside>

  <!-- Mobile drawer -->
  <div v-if="ui.mobileNavOpen" class="fixed inset-0 z-50 lg:hidden">
    <div class="absolute inset-0 animate-fade-in bg-ink-950/70 backdrop-blur-sm" @click="ui.mobileNavOpen = false" />
    <aside class="relative flex h-full w-[280px] max-w-[85vw] animate-slide-in flex-col bg-ink-900 shadow-lift">
      <div class="flex h-[60px] shrink-0 items-center justify-between px-4 shadow-bar">
        <Logo size="sm" />
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-white"
          aria-label="Close menu"
          @click="ui.mobileNavOpen = false"
        >
          <Icon name="x" :size="20" />
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  </div>
</template>
