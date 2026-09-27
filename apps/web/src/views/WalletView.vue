<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useWalletStore } from "../stores/wallet";
import { useUiStore } from "../stores/ui";
import { formatDate, formatUsd } from "../lib/format";
import { txMeta } from "../lib/transactions";
import CoinIcon from "../components/CoinIcon.vue";
import Icon from "../components/Icon.vue";

const wallet = useWalletStore();
const ui = useUiStore();

onMounted(() => {
  wallet.fetchBalance();
  wallet.fetchTransactions();
});

const deposited = computed(() =>
  wallet.transactions.filter((t) => t.type === "TOPUP").reduce((sum, t) => sum + t.amountCents, 0)
);
const bonuses = computed(() =>
  wallet.transactions.filter((t) => t.type !== "TOPUP").reduce((sum, t) => sum + t.amountCents, 0)
);
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Icon name="wallet" :size="22" class="text-ink-300" /> Wallet
        </h1>
        <p class="mt-1 text-sm text-ink-300">Your demo funds and activity. Nothing here has real-world value.</p>
      </div>
      <button type="button" class="btn-accent" @click="ui.openWallet()">
        <Icon name="plus" :size="16" :stroke="2.5" /> Deposit
      </button>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue to-[#0a3f86] p-6 shadow-card">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/70">Total balance</p>
        <p class="mt-2 text-3xl font-extrabold tabular-nums">{{ formatUsd(wallet.balanceCents) }}</p>
        <p class="mt-1 text-xs font-semibold text-white/60">USD &middot; demo funds</p>
        <CoinIcon coin="usd" :size="120" class="absolute -bottom-8 -right-6 opacity-20" />
      </div>
      <div class="panel p-6">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          <Icon name="wallet" :size="14" /> Demo deposits
        </p>
        <p class="mt-2 text-2xl font-extrabold tabular-nums">{{ formatUsd(deposited) }}</p>
        <p class="mt-1 text-xs text-ink-400">Simulated crypto top-ups</p>
      </div>
      <div class="panel p-6">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          <Icon name="gift" :size="14" /> Bonuses
        </p>
        <p class="mt-2 text-2xl font-extrabold tabular-nums">{{ formatUsd(bonuses) }}</p>
        <p class="mt-1 text-xs text-ink-400">Welcome + referral credits</p>
      </div>
    </div>

    <section>
      <h2 class="mb-3 text-lg font-bold">Transactions</h2>
      <div class="overflow-hidden rounded-lg shadow-card">
        <div class="hidden grid-cols-[1.2fr_2fr_1.2fr_1fr] gap-4 bg-ink-900 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-400 sm:grid">
          <span>Type</span><span>Details</span><span>Date</span><span class="text-right">Amount</span>
        </div>
        <div v-if="wallet.transactions.length === 0" class="bg-ink-700 px-5 py-10 text-center text-sm text-ink-300">
          No transactions yet.
        </div>
        <div
          v-for="(tx, i) in wallet.transactions"
          :key="tx.id"
          class="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 px-4 py-3 text-sm sm:grid-cols-[1.2fr_2fr_1.2fr_1fr] sm:gap-4 sm:px-5"
          :class="i % 2 ? 'bg-ink-800' : 'bg-ink-700'"
        >
          <div class="row-span-2 flex items-center gap-3 sm:row-span-1">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" :class="txMeta(tx.type).tone">
              <Icon :name="txMeta(tx.type).icon" :size="15" />
            </span>
            <span class="hidden font-semibold sm:inline">{{ txMeta(tx.type).label }}</span>
          </div>
          <div class="min-w-0">
            <p class="font-semibold sm:hidden">{{ txMeta(tx.type).label }}</p>
            <p class="truncate text-xs text-ink-300 sm:text-sm">{{ tx.note ?? "—" }}</p>
          </div>
          <span class="hidden text-ink-300 sm:block">{{ formatDate(tx.createdAt) }}</span>
          <span class="row-span-2 text-right font-bold tabular-nums text-accent sm:row-span-1">+{{ formatUsd(tx.amountCents) }}</span>
          <span class="text-xs text-ink-400 sm:hidden">{{ formatDate(tx.createdAt) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
