<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useWalletStore } from "../stores/wallet";
import { useUiStore } from "../stores/ui";
import { formatUsd } from "../lib/format";
import { txMeta } from "../lib/transactions";
import CoinIcon from "./CoinIcon.vue";
import Icon from "./Icon.vue";

type Method = "crypto_btc" | "crypto_eth" | "crypto_usdt";

const wallet = useWalletStore();
const ui = useUiStore();

const tab = ref<"deposit" | "overview">("deposit");
const amount = ref<number | "">(100);
const method = ref<Method>("crypto_usdt");
const credited = ref<number | null>(null);
const error = ref("");

const methods = [
  { id: "crypto_usdt", coin: "usdt", ticker: "USDT", name: "Tether" },
  { id: "crypto_btc", coin: "btc", ticker: "BTC", name: "Bitcoin" },
  { id: "crypto_eth", coin: "eth", ticker: "ETH", name: "Ethereum" },
] as const;

const quickAmounts = [25, 100, 500, 1000, 5000];
const MAX_USD = 1_000_000;

const amountCents = computed(() => Math.round(Number(amount.value || 0) * 100));
const valid = computed(() => amountCents.value > 0 && amountCents.value <= MAX_USD * 100);
const selected = computed(() => methods.find((m) => m.id === method.value)!);

function close() {
  ui.walletOpen = false;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
  wallet.fetchBalance().catch(() => {});
  wallet.fetchTransactions().catch(() => {});
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});

async function deposit() {
  if (!valid.value) return;
  error.value = "";
  try {
    await wallet.topup(amountCents.value, method.value);
    credited.value = amountCents.value;
  } catch {
    error.value = "Couldn't reach the demo API. Is it running on port 8787?";
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink-950/75 backdrop-blur-sm sm:items-center sm:p-4"
    @click.self="close"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-title"
      class="max-h-[92vh] w-full animate-pop-in overflow-y-auto rounded-t-xl bg-ink-800 shadow-lift sm:max-w-[460px] sm:rounded-xl"
    >
      <header class="sticky top-0 z-10 flex h-14 items-center justify-between bg-ink-800 px-5">
        <h3 id="wallet-title" class="flex items-center gap-2 font-bold">
          <Icon name="wallet" :size="18" class="text-ink-300" /> Wallet
        </h3>
        <button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-700 hover:text-white" aria-label="Close" @click="close">
          <Icon name="x" :size="20" />
        </button>
      </header>

      <div class="px-5 pb-6">
        <div class="mb-5 inline-flex rounded-full bg-ink-950 p-1">
          <button
            v-for="t in (['deposit', 'overview'] as const)"
            :key="t"
            type="button"
            class="rounded-full px-5 py-2 text-sm font-semibold capitalize transition"
            :class="tab === t ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'"
            @click="tab = t; credited = null"
          >
            {{ t }}
          </button>
        </div>

        <!-- Deposit: success -->
        <div v-if="tab === 'deposit' && credited !== null" class="animate-pop-in py-4 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Icon name="check" :size="32" :stroke="3" />
          </div>
          <p class="mt-4 text-lg font-extrabold">Balance credited</p>
          <p class="mt-1 text-sm text-ink-300">
            +{{ formatUsd(credited) }} via {{ selected.ticker }} &middot; simulated, no real payment
          </p>
          <div class="mt-5 rounded-lg bg-ink-900 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">New demo balance</p>
            <p class="mt-1 text-2xl font-extrabold tabular-nums">{{ formatUsd(wallet.balanceCents) }}</p>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <button type="button" class="btn-ghost" @click="credited = null">Deposit again</button>
            <button type="button" class="btn-accent" @click="close">Done</button>
          </div>
        </div>

        <!-- Deposit: form -->
        <form v-else-if="tab === 'deposit'" class="space-y-5" @submit.prevent="deposit">
          <div class="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3">
            <span class="text-sm font-semibold text-ink-300">Balance</span>
            <span class="flex items-center gap-2 font-bold tabular-nums">
              {{ formatUsd(wallet.balanceCents) }} <CoinIcon coin="usd" :size="16" />
            </span>
          </div>

          <div>
            <span class="field-label">Currency</span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="m in methods"
                :key="m.id"
                type="button"
                class="flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 transition"
                :class="method === m.id ? 'border-blue bg-blue/10' : 'border-ink-600 bg-ink-900 hover:border-ink-500'"
                @click="method = m.id"
              >
                <CoinIcon :coin="m.coin" :size="26" />
                <span class="text-sm font-bold">{{ m.ticker }}</span>
                <span class="text-[11px] text-ink-400">{{ m.name }}</span>
              </button>
            </div>
          </div>

          <div>
            <label for="deposit-amount" class="field-label">Amount</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-ink-400">$</span>
              <input
                id="deposit-amount"
                v-model.number="amount"
                type="number"
                min="1"
                :max="MAX_USD"
                step="any"
                inputmode="decimal"
                class="field h-12 pl-7 pr-16 text-base tabular-nums"
              />
              <span class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded bg-ink-700 px-2 py-1 text-xs font-bold">
                <CoinIcon :coin="selected.coin" :size="14" /> {{ selected.ticker }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="q in quickAmounts"
                :key="q"
                type="button"
                class="rounded-md px-3 py-1.5 text-xs font-bold transition"
                :class="amount === q ? 'bg-ink-500 text-white' : 'bg-ink-700 text-ink-300 hover:bg-ink-600 hover:text-white'"
                @click="amount = q"
              >
                ${{ q.toLocaleString("en-US") }}
              </button>
            </div>
          </div>

          <div class="flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
            <Icon name="info" :size="16" class="mt-px text-amber-300" />
            <p>
              <span class="font-bold">Simulated payment.</span> No wallet connection, no blockchain, no real
              transaction &mdash; this button just credits your demo balance.
            </p>
          </div>

          <p v-if="error" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error }}</p>

          <button type="submit" class="btn-accent h-12 w-full text-base" :disabled="wallet.loading || !valid">
            {{ wallet.loading ? "Processing…" : `Deposit ${formatUsd(amountCents)}` }}
          </button>
        </form>

        <!-- Overview -->
        <div v-else class="space-y-4">
          <div class="relative overflow-hidden rounded-lg bg-gradient-to-br from-blue to-[#0a3f86] p-5">
            <p class="text-xs font-semibold uppercase tracking-wide text-white/70">Demo balance</p>
            <p class="mt-1 text-3xl font-extrabold tabular-nums">{{ formatUsd(wallet.balanceCents) }}</p>
            <CoinIcon coin="usd" :size="96" class="absolute -bottom-6 -right-4 opacity-20" />
          </div>
          <div>
            <p class="mb-2 text-sm font-semibold text-ink-300">Recent activity</p>
            <div class="overflow-hidden rounded-lg">
              <div v-if="wallet.transactions.length === 0" class="bg-ink-900 p-4 text-sm text-ink-300">No transactions yet.</div>
              <div
                v-for="(tx, i) in wallet.transactions.slice(0, 5)"
                :key="tx.id"
                class="flex items-center gap-3 px-4 py-3 text-sm"
                :class="i % 2 ? 'bg-ink-800' : 'bg-ink-900'"
              >
                <span class="flex h-8 w-8 items-center justify-center rounded-full" :class="txMeta(tx.type).tone">
                  <Icon :name="txMeta(tx.type).icon" :size="15" />
                </span>
                <span class="flex-1 font-semibold">{{ txMeta(tx.type).label }}</span>
                <span class="font-bold tabular-nums text-accent">+{{ formatUsd(tx.amountCents) }}</span>
              </div>
            </div>
          </div>
          <RouterLink :to="{ name: 'wallet' }" class="btn-ghost w-full" @click="close">View full history</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
