<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWalletStore } from "../stores/wallet";
import BalanceBadge from "./BalanceBadge.vue";

const auth = useAuthStore();
const wallet = useWalletStore();
const router = useRouter();

onMounted(() => {
  wallet.fetchBalance();
});

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <header class="border-b border-surface-800 bg-surface-900/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
      <RouterLink to="/lobby" class="flex items-center gap-2 font-bold text-lg">
        <span class="text-brand-400">Nova</span><span class="text-gold">Spin</span>
      </RouterLink>

      <nav class="hidden sm:flex items-center gap-6 text-sm text-slate-300">
        <RouterLink to="/lobby" class="hover:text-white transition">Lobby</RouterLink>
        <RouterLink to="/wallet" class="hover:text-white transition">Wallet</RouterLink>
        <RouterLink to="/referrals" class="hover:text-white transition">Referrals</RouterLink>
      </nav>

      <div class="flex items-center gap-3">
        <BalanceBadge :cents="wallet.balanceCents" />
        <RouterLink
          to="/wallet"
          class="hidden sm:inline-block bg-brand-500 hover:bg-brand-400 transition text-white text-sm font-semibold px-3 py-1.5 rounded-full"
        >
          + Top up
        </RouterLink>
        <button
          class="text-xs text-slate-400 hover:text-white transition"
          @click="logout"
        >
          Log out
        </button>
      </div>
    </div>
  </header>
</template>
