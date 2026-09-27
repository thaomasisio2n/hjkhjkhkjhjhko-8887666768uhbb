<script setup lang="ts">
import { ref } from "vue";
import { useWalletStore } from "../stores/wallet";

const emit = defineEmits<{ close: [] }>();
const wallet = useWalletStore();

const amount = ref(50);
const method = ref<"crypto_btc" | "crypto_eth" | "crypto_usdt">("crypto_usdt");
const done = ref(false);

const methods = [
  { id: "crypto_btc", label: "Bitcoin" },
  { id: "crypto_eth", label: "Ethereum" },
  { id: "crypto_usdt", label: "USDT" },
] as const;

async function pay() {
  await wallet.topup(Math.round(amount.value * 100), method.value);
  done.value = true;
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-20 px-4" @click.self="emit('close')">
    <div class="w-full max-w-sm bg-surface-900 border border-surface-700 rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Top up (demo)</h3>
        <button class="text-slate-400 hover:text-white" @click="emit('close')">&times;</button>
      </div>

      <template v-if="!done">
        <p class="text-xs text-slate-400 mb-4">
          Simulated crypto payment &mdash; no wallet connection, no blockchain, no
          real transaction. Clicking pay instantly credits your demo balance.
        </p>

        <label class="text-xs text-slate-400">Amount (USD)</label>
        <input
          v-model.number="amount"
          type="number"
          min="1"
          class="mt-1 mb-4 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
        />

        <label class="text-xs text-slate-400">Pay with</label>
        <div class="grid grid-cols-3 gap-2 mt-1 mb-5">
          <button
            v-for="m in methods"
            :key="m.id"
            class="text-xs rounded-lg py-2 border transition"
            :class="method === m.id ? 'border-brand-400 bg-brand-500/20' : 'border-surface-700 hover:border-surface-600'"
            @click="method = m.id"
          >
            {{ m.label }}
          </button>
        </div>

        <button
          class="w-full bg-brand-500 hover:bg-brand-400 transition text-white font-semibold text-sm rounded-lg py-2.5 disabled:opacity-50"
          :disabled="wallet.loading || amount <= 0"
          @click="pay"
        >
          {{ wallet.loading ? "Processing..." : `Pay $${amount || 0} (demo)` }}
        </button>
      </template>

      <template v-else>
        <div class="text-center py-4">
          <p class="text-3xl mb-2">&#9989;</p>
          <p class="font-semibold">Balance credited</p>
          <p class="text-xs text-slate-400 mt-1">Fake funds only, added instantly for the demo.</p>
          <button
            class="mt-5 w-full bg-surface-800 hover:bg-surface-700 transition text-sm rounded-lg py-2.5"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
