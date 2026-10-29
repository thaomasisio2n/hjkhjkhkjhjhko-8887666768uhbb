<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWalletStore } from "../stores/wallet";
import type { IconName } from "../lib/icons";
import { t } from "../i18n";
import Icon from "../components/Icon.vue";
import SettingsGeneral from "../components/settings/SettingsGeneral.vue";
import SettingsPrivacy from "../components/settings/SettingsPrivacy.vue";
import SettingsResponsible from "../components/settings/SettingsResponsible.vue";
import SettingsSecurity from "../components/settings/SettingsSecurity.vue";

const auth = useAuthStore();
const wallet = useWalletStore();
const route = useRoute();
const router = useRouter();

onMounted(() => {
  auth.refresh().catch(() => {});
  wallet.fetchBalance().catch(() => {});
});

const TABS = [
  { id: "general", icon: "user", component: SettingsGeneral },
  { id: "security", icon: "lock", component: SettingsSecurity },
  { id: "responsible", icon: "shield", component: SettingsResponsible },
  { id: "privacy", icon: "eye-off", component: SettingsPrivacy },
] as const satisfies readonly { id: string; icon: IconName; component: unknown }[];

const active = computed(() => TABS.find((tab) => tab.id === route.query.tab) ?? TABS[0]);

function select(id: string) {
  router.replace({ name: "settings", query: id === "general" ? {} : { tab: id } });
}

// The register page is for signed-out visitors, so leave the demo account first.
function createOwnAccount() {
  auth.logout();
  router.push({ name: "register" });
}
</script>

<template>
  <div class="page py-6 sm:py-8">
    <h1 class="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
      <Icon name="settings" :size="22" class="text-ink-300" /> {{ t("settings.title") }}
    </h1>

    <div
      v-if="auth.user?.shared"
      id="shared-account-note"
      class="mb-6 flex flex-col gap-4 rounded-lg border border-blue/30 bg-blue/10 p-4 sm:flex-row sm:items-center"
      role="note"
    >
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/20 text-blue-hover">
        <Icon name="lock" :size="18" />
      </span>
      <div class="flex-1">
        <p class="font-bold">{{ t("settings.sharedTitle") }}</p>
        <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.sharedText") }}</p>
      </div>
      <button type="button" class="btn-blue shrink-0" @click="createOwnAccount">{{ t("settings.sharedCta") }}</button>
    </div>

    <div class="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav class="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:self-start lg:rounded-lg lg:bg-ink-900 lg:p-2" role="tablist" :aria-label="t('settings.title')">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="active.id === tab.id"
          class="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-semibold transition"
          :class="active.id === tab.id ? 'bg-ink-600 text-white' : 'bg-ink-900 text-ink-300 hover:bg-ink-700 hover:text-white lg:bg-transparent'"
          @click="select(tab.id)"
        >
          <Icon :name="tab.icon" :size="16" />
          {{ t(`settings.tabs.${tab.id}`) }}
        </button>
      </nav>

      <div class="min-w-0">
        <component :is="active.component" :key="active.id" />
      </div>
    </div>
  </div>
</template>
