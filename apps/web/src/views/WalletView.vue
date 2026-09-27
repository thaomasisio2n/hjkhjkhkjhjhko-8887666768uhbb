<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useWalletStore } from "../stores/wallet";
import BalanceBadge from "../components/BalanceBadge.vue";
import TopupModal from "../components/TopupModal.vue";

const wallet = useWalletStore();
const showModal = ref(false);

onMounted(() => {
  wallet.fetchBalance();
  wallet.fetchTransactions();
});

function typeLabel(type: string) {
  return {
    TOPUP: "Top-up",
    REFERRAL_BONUS: "Referral bonus",
    WELCOME_BONUS: "Welcome bonus",
    ADJUSTMENT: "Adjustment",
  }[type] ?? type;
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Wallet</h1>

    <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6 flex items-center justify-between mb-8">
      <div>
        <p class="text-xs text-slate-400 uppercase tracking-wide">Balance</p>
        <div class="mt-2">
          <BalanceBadge :cents="wallet.balanceCents" />
        </div>
      </div>
      <button
        class="bg-brand-500 hover:bg-brand-400 transition text-white font-semibold text-sm px-4 py-2.5 rounded-full"
        @click="showModal = true"
      >
        + Top up
      </button>
    </div>

    <h2 class="text-lg font-semibold mb-3">Transaction history</h2>
    <div class="bg-surface-900 border border-surface-700 rounded-xl divide-y divide-surface-800">
      <div v-if="wallet.transactions.length === 0" class="p-4 text-sm text-slate-400">
        No transactions yet.
      </div>
      <div
        v-for="tx in wallet.transactions"
        :key="tx.id"
        class="p-4 flex items-center justify-between text-sm"
      >
        <div>
          <p class="font-medium">{{ typeLabel(tx.type) }}</p>
          <p class="text-xs text-slate-400">{{ tx.note }}</p>
        </div>
        <span class="font-semibold text-green-400">
          +{{ (tx.amountCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) }}
        </span>
      </div>
    </div>

    <TopupModal v-if="showModal" @close="showModal = false" />
  </div>
</template>
