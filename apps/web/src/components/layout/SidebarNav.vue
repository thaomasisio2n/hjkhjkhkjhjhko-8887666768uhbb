<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute, type RouteLocationRaw } from "vue-router";
import { useGamesStore } from "../../stores/games";
import { useUiStore } from "../../stores/ui";
import { KNOWN_CATEGORIES, sortCategories } from "../../lib/categories";
import type { IconName } from "../../lib/icons";
import Icon from "../Icon.vue";

defineProps<{ collapsed?: boolean }>();

interface NavItem {
  label: string;
  icon: IconName;
  to: RouteLocationRaw;
  active: boolean;
  badge?: number;
}

const route = useRoute();
const games = useGamesStore();
const ui = useUiStore();

const currentTab = computed(() => (route.name === "lobby" ? String(route.query.tab ?? "lobby") : null));

const groups = computed<NavItem[][]>(() => {
  const categories = games.loaded ? sortCategories(Object.keys(games.byCategory)) : KNOWN_CATEGORIES;
  const tabItem = (label: string, icon: IconName, tab: string, badge?: number): NavItem => ({
    label,
    icon,
    to: tab === "lobby" ? { name: "lobby" } : { name: "lobby", query: { tab } },
    active: currentTab.value === tab,
    badge,
  });

  return [
    [
      tabItem("Favourites", "heart", "favourites", ui.favourites.length || undefined),
      tabItem("Recent", "history", "recent"),
    ],
    [tabItem("Lobby", "lobby", "lobby"), ...categories.map((c) => tabItem(c.name, c.icon, c.slug))],
    [
      { label: "Wallet", icon: "wallet", to: { name: "wallet" }, active: route.name === "wallet" },
      { label: "Refer & Earn", icon: "users", to: { name: "referrals" }, active: route.name === "referrals" },
    ],
  ];
});
</script>

<template>
  <nav class="space-y-3">
    <div v-for="(group, gi) in groups" :key="gi" class="rounded-md bg-ink-800 p-1">
      <RouterLink
        v-for="item in group"
        :key="item.label"
        :to="item.to"
        :title="collapsed ? item.label : undefined"
        class="flex h-10 items-center gap-3 rounded-md text-sm font-semibold transition"
        :class="[
          collapsed ? 'justify-center px-0' : 'px-3',
          item.active ? 'bg-ink-600 text-white' : 'text-white hover:bg-ink-700',
        ]"
      >
        <Icon :name="item.icon" :size="18" :class="item.active ? 'text-white' : 'text-ink-300'" />
        <template v-if="!collapsed">
          <span class="flex-1 truncate">{{ item.label }}</span>
          <span v-if="item.badge" class="rounded-full bg-ink-600 px-2 py-0.5 text-[11px] font-bold text-ink-300">
            {{ item.badge }}
          </span>
        </template>
      </RouterLink>
    </div>
  </nav>
</template>
