<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useWalletStore } from "../../stores/wallet";
import { useUiStore } from "../../stores/ui";
import { initials } from "../../lib/format";
import CoinIcon from "../CoinIcon.vue";
import Icon from "../Icon.vue";
import Logo from "../Logo.vue";
import NotificationBell from "../NotificationBell.vue";

const auth = useAuthStore();
const wallet = useWalletStore();
const ui = useUiStore();
const router = useRouter();

const menuOpen = ref(false);

// Balance is kept fresh by the notification bell's polling.
onMounted(() => {
  if (!auth.user) auth.fetchMe().catch(() => {});
});

function logout() {
  menuOpen.value = false;
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <header class="sticky top-0 z-30 h-[60px] bg-ink-900 shadow-bar">
    <div class="page flex h-full items-center justify-between gap-2">
      <Logo class="hidden sm:inline-flex" />
      <Logo size="sm" class="sm:hidden" />

      <div class="flex min-w-0 items-center">
        <button
          type="button"
          class="flex h-10 min-w-0 items-center gap-2 rounded-l-md bg-ink-950 px-3 text-sm font-bold tabular-nums transition hover:bg-black/60 sm:px-4"
          @click="ui.openWallet()"
        >
          <span class="truncate">{{ ui.money(wallet.balanceCents) }}</span>
          <CoinIcon coin="usd" :size="16" />
          <span class="hidden rounded bg-amber-400/15 px-1 py-px text-[9px] font-extrabold uppercase tracking-wider text-amber-300 md:inline">
            demo
          </span>
        </button>
        <button type="button" class="btn-blue h-10 rounded-l-none px-3 sm:px-4" @click="ui.openWallet()">
          <Icon name="wallet" :size="18" class="sm:hidden" />
          <span class="hidden sm:inline">Wallet</span>
        </button>
      </div>

      <div class="flex items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          class="hidden h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-white transition hover:bg-ink-700 sm:flex"
          @click="ui.openSearch()"
        >
          <Icon name="search" :size="18" class="text-ink-300" />
          <span class="hidden md:inline">Search</span>
          <kbd class="hidden rounded border border-ink-600 px-1.5 text-[11px] font-bold text-ink-400 lg:inline">/</kbd>
        </button>

        <NotificationBell />

        <div class="relative">
          <button
            type="button"
            class="flex h-10 items-center gap-1.5 rounded-md px-1.5 transition hover:bg-ink-700 sm:px-2"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-600 text-xs font-extrabold text-accent-ink">
              {{ initials(auth.user?.displayName) }}
            </span>
            <Icon name="chevron-down" :size="14" class="hidden text-ink-300 transition sm:block" :class="{ 'rotate-180': menuOpen }" />
          </button>

          <template v-if="menuOpen">
            <div class="fixed inset-0 z-40" @click="menuOpen = false" />
            <div
              role="menu"
              class="absolute right-0 top-[calc(100%+10px)] z-50 w-60 animate-pop-in rounded-md bg-white py-1.5 text-ink-900 shadow-lift"
            >
              <span class="absolute -top-1.5 right-4 h-3 w-3 rotate-45 bg-white" />
              <div class="relative border-b border-slate-200 px-4 pb-2.5 pt-1.5">
                <p class="truncate text-sm font-bold">{{ auth.user?.displayName ?? "Player" }}</p>
                <p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p>
              </div>
              <RouterLink :to="{ name: 'wallet' }" class="flex items-center gap-3 px-4 py-2 text-sm font-semibold hover:bg-slate-100" @click="menuOpen = false">
                <Icon name="wallet" :size="16" class="text-slate-500" /> Wallet
              </RouterLink>
              <RouterLink :to="{ name: 'referrals' }" class="flex items-center gap-3 px-4 py-2 text-sm font-semibold hover:bg-slate-100" @click="menuOpen = false">
                <Icon name="users" :size="16" class="text-slate-500" /> Refer &amp; Earn
              </RouterLink>
              <RouterLink :to="{ name: 'lobby', query: { tab: 'favourites' } }" class="flex items-center gap-3 px-4 py-2 text-sm font-semibold hover:bg-slate-100" @click="menuOpen = false">
                <Icon name="heart" :size="16" class="text-slate-500" /> Favourites
              </RouterLink>
              <RouterLink :to="{ name: 'settings' }" class="flex items-center gap-3 px-4 py-2 text-sm font-semibold hover:bg-slate-100" @click="menuOpen = false">
                <Icon name="settings" :size="16" class="text-slate-500" /> Settings
              </RouterLink>
              <button type="button" role="menuitemcheckbox" :aria-checked="ui.streamerMode"
                class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-semibold hover:bg-slate-100" @click="ui.toggleStreamerMode()">
                <Icon :name="ui.streamerMode ? 'eye-off' : 'eye'" :size="16" class="text-slate-500" />
                <span class="flex-1">Streamer mode</span>
                <span class="relative h-5 w-9 rounded-full transition" :class="ui.streamerMode ? 'bg-accent' : 'bg-slate-300'">
                  <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" :class="ui.streamerMode ? 'left-[18px]' : 'left-0.5'" />
                </span>
              </button>
              <div class="my-1 border-t border-slate-200" />
              <button type="button" class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-semibold hover:bg-slate-100" @click="logout">
                <Icon name="logout" :size="16" class="text-slate-500" /> Log out
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>
