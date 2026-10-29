<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { useWalletStore } from "../stores/wallet";
import { formatUsd, timeAgo } from "../lib/format";
import { invitedName, notificationCopy, txMeta } from "../lib/transactions";
import Icon from "./Icon.vue";
import { t } from "../i18n";

// Polling keeps the bell (and balance) live, e.g. when a friend signs up with
// your link in another window while you're recording.
const POLL_MS = 15_000;

const wallet = useWalletStore();
const ui = useUiStore();
const toast = useToastStore();

const open = ref(false);
const known = new Set<string>();
let primed = false;
let timer: ReturnType<typeof setInterval> | undefined;

const items = computed(() => wallet.transactions.slice(0, 8));
const isUnread = (createdAt: string) => new Date(createdAt).getTime() > ui.notificationsSeenAt;
const unread = computed(() => wallet.transactions.filter((tx) => isUnread(tx.createdAt)).length);

watch(
  () => wallet.transactions,
  (list) => {
    for (const tx of list) {
      if (known.has(tx.id)) continue;
      known.add(tx.id);
      if (primed && tx.type === "REFERRAL_BONUS") {
        const name = invitedName(tx.note) ?? t("notifications.aFriend");
        toast.push(t("toasts.referralJoined", { name, amount: formatUsd(tx.amountCents) }), "success", "users");
      }
    }
    if (list.length) primed = true;
  }
);

function poll() {
  if (document.visibilityState === "visible") wallet.refresh().catch(() => {});
}

function toggle() {
  if (open.value) ui.markNotificationsSeen();
  open.value = !open.value;
}

function close() {
  if (!open.value) return;
  open.value = false;
  ui.markNotificationsSeen();
}

onMounted(() => {
  poll();
  timer = setInterval(poll, POLL_MS);
  document.addEventListener("visibilitychange", poll);
});

onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", poll);
});
</script>

<template>
  <!-- Not positioned below sm, so the panel anchors to the sticky header and spans its width. -->
  <div class="sm:relative">
    <button
      type="button"
      class="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-300 transition hover:bg-ink-700 hover:text-white"
      :aria-label="unread ? t('notifications.unread', { count: unread }) : t('notifications.title')"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="toggle"
    >
      <Icon name="bell" :size="19" />
      <span
        v-if="unread"
        class="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-ink-900"
      >
        {{ unread > 9 ? "9+" : unread }}
      </span>
    </button>

    <template v-if="open">
      <div class="fixed inset-0 z-40" @click="close" />
      <div
        role="dialog"
:aria-label="t('notifications.title')"
        class="absolute inset-x-3 top-[calc(100%+6px)] z-50 animate-pop-in overflow-hidden rounded-lg bg-ink-700 shadow-lift sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-96"
      >
        <div class="flex items-center justify-between border-b border-ink-600 px-4 py-3">
          <p class="flex items-center gap-2 font-bold">
            <Icon name="bell" :size="16" class="text-ink-300" /> {{ t("notifications.title") }}
          </p>
          <button v-if="unread" type="button" class="text-xs font-semibold text-ink-300 hover:text-white" @click="ui.markNotificationsSeen()">
            {{ t("notifications.markRead") }}
          </button>
        </div>

        <div class="max-h-[60vh] overflow-y-auto">
          <div v-if="items.length === 0" class="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Icon name="bell" :size="24" class="text-ink-400" />
            <p class="text-sm text-ink-300">{{ t("notifications.empty") }}</p>
          </div>
          <div
            v-for="tx in items"
            :key="tx.id"
            class="flex gap-3 border-b border-ink-600/60 px-4 py-3 last:border-0"
            :class="{ 'bg-ink-600/40': isUnread(tx.createdAt) }"
          >
            <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full" :class="txMeta(tx.type).tone">
              <Icon :name="txMeta(tx.type).icon" :size="16" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-bold">{{ notificationCopy(tx).title }}</p>
                <span class="shrink-0 text-sm font-bold tabular-nums text-accent">+{{ ui.money(tx.amountCents) }}</span>
              </div>
              <p class="mt-0.5 text-xs leading-snug text-ink-300">{{ notificationCopy(tx).text }}</p>
              <p class="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
                <span v-if="isUnread(tx.createdAt)" class="h-1.5 w-1.5 rounded-full bg-blue-hover" />
                {{ timeAgo(tx.createdAt) }}
              </p>
            </div>
          </div>
        </div>

        <RouterLink :to="{ name: 'wallet' }" class="block border-t border-ink-600 px-4 py-3 text-center text-sm font-semibold text-ink-300 transition hover:bg-ink-600 hover:text-white" @click="close">
          {{ t("notifications.viewAll") }}
        </RouterLink>
      </div>
    </template>
  </div>
</template>
