<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useWalletStore } from "../stores/wallet";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { formatDate } from "../lib/format";
import { txMeta, txNote } from "../lib/transactions";
import { t, tc } from "../i18n";
import CoinIcon from "../components/CoinIcon.vue";
import Icon from "../components/Icon.vue";

const wallet = useWalletStore();
const ui = useUiStore();
const toast = useToastStore();

type Filter = "all" | "deposits" | "bonuses";
const filter = ref<Filter>("all");
const filters: { id: Filter; labelKey: string }[] = [
  { id: "all", labelKey: "wallet.filterAll" },
  { id: "deposits", labelKey: "wallet.filterDeposits" },
  { id: "bonuses", labelKey: "wallet.filterBonuses" },
];

const visible = computed(() =>
  wallet.transactions.filter((tx) =>
    filter.value === "all" ? true : filter.value === "deposits" ? tx.type === "TOPUP" : tx.type !== "TOPUP"
  )
);

function exportCsv() {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    [t("wallet.colDate"), t("wallet.colType"), `${t("wallet.colAmount")} (USD)`, t("wallet.colDetails")],
    ...visible.value.map((tx) => [
      new Date(tx.createdAt).toISOString(),
      txMeta(tx.type).label,
      (tx.amountCents / 100).toFixed(2),
      tx.note ? txNote(tx.note) : "",
    ]),
  ];
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `novaspin-demo-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.push(tc("toasts.exported", visible.value.length), "success", "download");
}

onMounted(() => {
  wallet.fetchBalance();
  wallet.fetchTransactions();
});

const deposited = computed(() =>
  wallet.transactions.filter((tx) => tx.type === "TOPUP").reduce((sum, tx) => sum + tx.amountCents, 0)
);
const bonuses = computed(() =>
  wallet.transactions.filter((tx) => tx.type !== "TOPUP").reduce((sum, tx) => sum + tx.amountCents, 0)
);
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Icon name="wallet" :size="22" class="text-ink-300" /> {{ t("wallet.title") }}
        </h1>
        <p class="mt-1 text-sm text-ink-300">{{ t("wallet.subtitle") }}</p>
      </div>
      <button type="button" class="btn-accent" @click="ui.openWallet()">
        <Icon name="plus" :size="16" :stroke="2.5" /> {{ t("wallet.deposit") }}
      </button>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue to-[#0a3f86] p-6 shadow-card">
        <p class="text-xs font-semibold uppercase tracking-wide text-white/70">{{ t("wallet.totalBalance") }}</p>
        <p class="mt-2 text-3xl font-extrabold tabular-nums">{{ ui.money(wallet.balanceCents) }}</p>
        <p class="mt-1 text-xs font-semibold text-white/60">{{ t("wallet.usdDemo") }}</p>
        <CoinIcon coin="usd" :size="120" class="absolute -bottom-8 -right-6 opacity-20" />
      </div>
      <div class="panel p-6">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          <Icon name="wallet" :size="14" /> {{ t("wallet.demoDeposits") }}
        </p>
        <p class="mt-2 text-2xl font-extrabold tabular-nums">{{ ui.money(deposited) }}</p>
        <p class="mt-1 text-xs text-ink-400">{{ t("wallet.demoDepositsHint") }}</p>
      </div>
      <div class="panel p-6">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          <Icon name="gift" :size="14" /> {{ t("wallet.bonuses") }}
        </p>
        <p class="mt-2 text-2xl font-extrabold tabular-nums">{{ ui.money(bonuses) }}</p>
        <p class="mt-1 text-xs text-ink-400">{{ t("wallet.bonusesHint") }}</p>
      </div>
    </div>

    <section>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-bold">{{ t("wallet.transactions") }}</h2>
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-full bg-ink-900 p-1" role="tablist" :aria-label="t('wallet.filterAria')">
            <button
              v-for="f in filters"
              :key="f.id"
              type="button"
              role="tab"
              :aria-selected="filter === f.id"
              class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
              :class="filter === f.id ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'"
              @click="filter = f.id"
            >
              {{ t(f.labelKey) }}
            </button>
          </div>
          <button type="button" class="btn-ghost h-9 px-3" :disabled="!visible.length" :title="t('wallet.csvTitle')" @click="exportCsv">
            <Icon name="download" :size="16" /> <span class="hidden sm:inline">{{ t("wallet.csv") }}</span>
          </button>
        </div>
      </div>
      <div class="overflow-hidden rounded-lg shadow-card">
        <div class="hidden grid-cols-[1.2fr_2fr_1.2fr_1fr] gap-4 bg-ink-900 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-400 sm:grid">
          <span>{{ t("wallet.colType") }}</span><span>{{ t("wallet.colDetails") }}</span><span>{{ t("wallet.colDate") }}</span><span class="text-right">{{ t("wallet.colAmount") }}</span>
        </div>
        <div v-if="visible.length === 0" class="bg-ink-700 px-5 py-10 text-center text-sm text-ink-300">
          {{ wallet.transactions.length ? t("wallet.noMatch") : t("wallet.noTransactions") }}
        </div>
        <div
          v-for="(tx, i) in visible"
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
            <p class="truncate text-xs text-ink-300 sm:text-sm">{{ txNote(tx.note) }}</p>
          </div>
          <span class="hidden text-ink-300 sm:block">{{ formatDate(tx.createdAt) }}</span>
          <span class="row-span-2 text-right font-bold tabular-nums text-accent sm:row-span-1">+{{ ui.money(tx.amountCents) }}</span>
          <span class="text-xs text-ink-400 sm:hidden">{{ formatDate(tx.createdAt) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
