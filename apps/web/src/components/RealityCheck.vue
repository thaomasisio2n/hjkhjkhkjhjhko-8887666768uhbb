<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useUiStore } from "../stores/ui";
import { useWalletStore } from "../stores/wallet";
import { formatUsd } from "../lib/format";
import { formatDuration, sessionStart } from "../lib/session";
import Icon from "./Icon.vue";

// Responsible-play reminder: every N minutes (set in Settings) it interrupts
// with how long the session has lasted and what was deposited during it.
const auth = useAuthStore();
const ui = useUiStore();
const wallet = useWalletStore();
const router = useRouter();

const start = sessionStart();
const lastPrompt = ref(start);
const now = ref(Date.now());
const open = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

function tick() {
  now.value = Date.now();
  if (!ui.realityCheckMinutes || open.value) return;
  if (now.value - lastPrompt.value >= ui.realityCheckMinutes * 60_000) open.value = true;
}

// A new interval counts from the moment it's chosen, not from sign-in.
watch(
  () => ui.realityCheckMinutes,
  () => (lastPrompt.value = Date.now())
);

const elapsed = computed(() => formatDuration(now.value - start));
const sessionDeposits = computed(() =>
  wallet.transactions
    .filter((t) => t.type === "TOPUP" && new Date(t.createdAt).getTime() >= start)
    .reduce((sum, t) => sum + t.amountCents, 0)
);

function keepGoing() {
  lastPrompt.value = Date.now();
  open.value = false;
}

function viewActivity() {
  keepGoing();
  router.push({ name: "wallet" });
}

function logout() {
  open.value = false;
  auth.logout();
  router.push({ name: "login" });
}

onMounted(() => {
  timer = setInterval(tick, 10_000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[55] flex animate-fade-in items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
    <div role="alertdialog" aria-modal="true" aria-labelledby="rc-title" class="w-full max-w-sm animate-pop-in rounded-xl bg-ink-800 p-6 text-center shadow-lift">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue/15 text-blue-hover">
        <Icon name="clock" :size="28" />
      </div>
      <h2 id="rc-title" class="mt-4 text-lg font-extrabold">Reality check</h2>
      <p class="mt-1 text-sm text-ink-300">You've been signed in for <span class="font-bold text-white">{{ elapsed }}</span>.</p>

      <div class="mt-5 grid grid-cols-2 gap-2 text-left">
        <div class="rounded-lg bg-ink-900 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Session time</p>
          <p class="mt-1 font-extrabold">{{ elapsed }}</p>
        </div>
        <div class="rounded-lg bg-ink-900 p-3">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Deposited</p>
          <p class="mt-1 font-extrabold tabular-nums">{{ formatUsd(sessionDeposits) }}</p>
        </div>
      </div>

      <div class="mt-6 space-y-2">
        <button type="button" class="btn-accent h-11 w-full" @click="keepGoing">Continue</button>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="btn-ghost" @click="viewActivity">View activity</button>
          <button type="button" class="btn-ghost" @click="logout">Log out</button>
        </div>
      </div>
      <p class="mt-4 text-xs text-ink-400">Reminders every {{ ui.realityCheckMinutes }} min &middot; change in Settings.</p>
    </div>
  </div>
</template>
