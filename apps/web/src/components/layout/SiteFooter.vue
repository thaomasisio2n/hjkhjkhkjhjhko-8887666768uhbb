<script setup lang="ts">
import { RouterLink } from "vue-router";
import { KNOWN_CATEGORIES, categoryLabel } from "../../lib/categories";
import { t } from "../../i18n";
import CoinIcon from "../CoinIcon.vue";
import LanguageSwitch from "../LanguageSwitch.vue";
import Logo from "../Logo.vue";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-16 bg-ink-900">
    <div class="page py-10">
      <div class="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <div>
          <h4 class="mb-4 text-sm font-bold">{{ t("footer.casino") }}</h4>
          <ul class="space-y-3 text-sm text-ink-300">
            <li><RouterLink :to="{ name: 'lobby' }" class="transition hover:text-white">{{ t("nav.lobby") }}</RouterLink></li>
            <li v-for="c in KNOWN_CATEGORIES" :key="c.slug">
              <RouterLink :to="{ name: 'lobby', query: { tab: c.slug } }" class="transition hover:text-white">{{ categoryLabel(c.name) }}</RouterLink>
            </li>
            <li><RouterLink :to="{ name: 'providers' }" class="transition hover:text-white">{{ t("nav.providers") }}</RouterLink></li>
          </ul>
        </div>
        <div>
          <h4 class="mb-4 text-sm font-bold">{{ t("footer.account") }}</h4>
          <ul class="space-y-3 text-sm text-ink-300">
            <li><RouterLink :to="{ name: 'wallet' }" class="transition hover:text-white">{{ t("nav.wallet") }}</RouterLink></li>
            <li><RouterLink :to="{ name: 'referrals' }" class="transition hover:text-white">{{ t("nav.refer") }}</RouterLink></li>
            <li><RouterLink :to="{ name: 'lobby', query: { tab: 'favourites' } }" class="transition hover:text-white">{{ t("nav.favourites") }}</RouterLink></li>
            <li><RouterLink :to="{ name: 'lobby', query: { tab: 'recent' } }" class="transition hover:text-white">{{ t("nav.recentlyPlayed") }}</RouterLink></li>
            <li><RouterLink :to="{ name: 'settings' }" class="transition hover:text-white">{{ t("nav.settings") }}</RouterLink></li>
            <li><RouterLink :to="{ name: 'help' }" class="transition hover:text-white">{{ t("nav.help") }}</RouterLink></li>
          </ul>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <h4 class="mb-4 text-sm font-bold">{{ t("footer.about") }}</h4>
          <p class="text-sm leading-relaxed text-ink-300">{{ t("footer.aboutText") }}</p>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <h4 class="mb-4 text-sm font-bold">{{ t("footer.payments") }}</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="coin in (['btc', 'eth', 'usdt'] as const)" :key="coin" class="flex items-center gap-2 rounded-md bg-ink-800 px-3 py-2 text-xs font-bold uppercase text-ink-300">
              <CoinIcon :coin="coin" :size="18" /> {{ coin }}
            </span>
          </div>
          <p class="mt-3 text-xs text-ink-400">{{ t("footer.paymentsNote") }}</p>
        </div>
      </div>

      <div class="my-8 border-t border-ink-700" />

      <div class="flex flex-col items-center gap-3 text-center">
        <Logo />
        <LanguageSwitch size="sm" />
        <p class="text-xs text-ink-400">{{ t("footer.rights", { year }) }}</p>
        <p class="max-w-2xl text-xs leading-relaxed text-ink-400">{{ t("footer.disclaimer") }}</p>
      </div>
    </div>
  </footer>
</template>
