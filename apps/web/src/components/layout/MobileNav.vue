<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUiStore } from "../../stores/ui";
import type { IconName } from "../../lib/icons";
import { t } from "../../i18n";
import Icon from "../Icon.vue";

const ui = useUiStore();
const route = useRoute();
const router = useRouter();

const items = computed<{ id: string; label: string; icon: IconName; active: boolean; action: () => void }[]>(() => [
  { id: "browse", label: t("nav.browse"), icon: "menu", active: ui.mobileNavOpen, action: () => (ui.mobileNavOpen = !ui.mobileNavOpen) },
  {
    id: "casino",
    label: t("nav.casino"),
    icon: "cherry",
    active: route.name === "lobby" && !ui.mobileNavOpen && !ui.searchOpen,
    action: () => router.push({ name: "lobby" }),
  },
  { id: "search", label: t("nav.search"), icon: "search", active: ui.searchOpen, action: () => ui.openSearch() },
  { id: "wallet", label: t("nav.wallet"), icon: "wallet", active: ui.walletOpen, action: () => ui.openWallet() },
  {
    id: "refer",
    label: t("nav.referShort"),
    icon: "users",
    active: route.name === "referrals" && !ui.mobileNavOpen && !ui.searchOpen,
    action: () => router.push({ name: "referrals" }),
  },
]);
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-ink-700 bg-ink-900 pb-[env(safe-area-inset-bottom)] lg:hidden">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition"
      :class="item.active ? 'text-white' : 'text-ink-300 hover:text-white'"
      @click="item.action"
    >
      <Icon :name="item.icon" :size="20" />
      {{ item.label }}
    </button>
  </nav>
</template>
