<script setup lang="ts">
import { RouterLink } from "vue-router";
import { KNOWN_CATEGORIES } from "../../lib/categories";
import CoinIcon from "../CoinIcon.vue";
import Logo from "../Logo.vue";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-16 bg-ink-900">
    <div class="page py-10">
      <div class="grid grid-cols-2 gap-8 lg:grid-cols-4">
        <div>
          <h4 class="mb-4 text-sm font-bold">Casino</h4>
          <ul class="space-y-3 text-sm text-ink-300">
            <li><RouterLink :to="{ name: 'lobby' }" class="transition hover:text-white">Lobby</RouterLink></li>
            <li v-for="c in KNOWN_CATEGORIES" :key="c.slug">
              <RouterLink :to="{ name: 'lobby', query: { tab: c.slug } }" class="transition hover:text-white">{{ c.name }}</RouterLink>
            </li>
          </ul>
        </div>
        <div>
          <h4 class="mb-4 text-sm font-bold">Account</h4>
          <ul class="space-y-3 text-sm text-ink-300">
            <li><RouterLink :to="{ name: 'wallet' }" class="transition hover:text-white">Wallet</RouterLink></li>
            <li><RouterLink :to="{ name: 'referrals' }" class="transition hover:text-white">Refer &amp; Earn</RouterLink></li>
            <li><RouterLink :to="{ name: 'lobby', query: { tab: 'favourites' } }" class="transition hover:text-white">Favourites</RouterLink></li>
            <li><RouterLink :to="{ name: 'lobby', query: { tab: 'recent' } }" class="transition hover:text-white">Recently played</RouterLink></li>
          </ul>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <h4 class="mb-4 text-sm font-bold">About this demo</h4>
          <p class="text-sm leading-relaxed text-ink-300">
            An educational UI walkthrough of a casino-aggregator lobby. There are no real games, no real payments and
            no withdrawals &mdash; every balance is simulated.
          </p>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <h4 class="mb-4 text-sm font-bold">Demo payment methods</h4>
          <div class="flex flex-wrap gap-2">
            <span v-for="coin in (['btc', 'eth', 'usdt'] as const)" :key="coin" class="flex items-center gap-2 rounded-md bg-ink-800 px-3 py-2 text-xs font-bold uppercase text-ink-300">
              <CoinIcon :coin="coin" :size="18" /> {{ coin }}
            </span>
          </div>
          <p class="mt-3 text-xs text-ink-400">Simulated only &mdash; no blockchain or processor is connected.</p>
        </div>
      </div>

      <div class="my-8 border-t border-ink-700" />

      <div class="flex flex-col items-center gap-3 text-center">
        <Logo />
        <p class="text-xs text-ink-400">© {{ year }} NovaSpin demo. All rights reserved.</p>
        <p class="max-w-2xl text-xs leading-relaxed text-ink-400">
          Not a gambling service. NovaSpin is a non-commercial educational demo with no licence, no real-money play and
          no payment processing. Do not deploy it publicly or present it as a real casino.
        </p>
      </div>
    </div>
  </footer>
</template>
