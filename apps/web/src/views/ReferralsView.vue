<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";
import { formatUsd, initials } from "../lib/format";
import { PALETTES } from "../lib/gameArt";
import type { IconName } from "../lib/icons";
import GameEmblem from "../components/GameEmblem.vue";
import Icon from "../components/Icon.vue";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  invited: { id: string; displayName: string; createdAt: string }[];
  totalEarnedCents: number;
}

const data = ref<ReferralData | null>(null);
const copied = ref<"link" | "code" | null>(null);

onMounted(async () => {
  const { data: res } = await api.get("/referrals");
  data.value = res;
});

async function copy(value: string, what: "link" | "code") {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = what;
    setTimeout(() => (copied.value = null), 1500);
  } catch {
    // clipboard access denied — non-critical for a demo
  }
}

const steps: { icon: IconName; title: string; text: string }[] = [
  { icon: "link", title: "Share your link", text: "Send your personal link or code to a friend." },
  { icon: "user", title: "They sign up", text: "They register with it and get a demo welcome balance." },
  { icon: "gift", title: "You both earn", text: "A demo referral bonus lands in your wallet instantly." },
];
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <!-- Hero -->
    <section
      class="relative overflow-hidden rounded-xl p-6 shadow-card sm:p-8"
      :style="{ background: `linear-gradient(120deg, ${PALETTES.emerald[1]} 0%, ${PALETTES.emerald[2]} 70%)` }"
    >
      <div class="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
      <div class="pointer-events-none absolute -bottom-10 -right-4 hidden h-60 w-60 rotate-[-8deg] sm:block">
        <div class="absolute inset-8 rounded-full bg-white/25 blur-2xl" />
        <GameEmblem class="relative h-full w-full" emblem="gift" :palette="PALETTES.emerald" />
      </div>
      <div class="relative max-w-lg">
        <span class="inline-block rounded bg-white px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-900">Refer &amp; Earn</span>
        <h1 class="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Invite friends. Earn demo bonuses.</h1>
        <p class="mt-2 text-sm text-white/80">
          Every friend who joins with your link gets a demo welcome balance, and you get a demo referral bonus. No real
          money changes hands.
        </p>
      </div>
    </section>

    <div v-if="!data" class="space-y-4">
      <div class="h-32 animate-pulse rounded-lg bg-ink-700" />
      <div class="grid gap-4 sm:grid-cols-3"><div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-ink-700" /></div>
    </div>

    <template v-else>
      <!-- Link -->
      <section class="panel p-5 sm:p-6">
        <label for="ref-link" class="field-label">Your referral link</label>
        <div class="flex gap-2">
          <input id="ref-link" readonly :value="data.referralLink" class="field min-w-0 flex-1 text-ink-300" @focus="($event.target as HTMLInputElement).select()" />
          <button type="button" class="btn-blue shrink-0" @click="copy(data.referralLink, 'link')">
            <Icon :name="copied === 'link' ? 'check' : 'copy'" :size="16" />
            <span class="hidden sm:inline">{{ copied === "link" ? "Copied" : "Copy" }}</span>
          </button>
        </div>
        <div class="mt-4 flex items-center gap-3 text-sm">
          <span class="text-ink-300">Code</span>
          <button type="button" class="inline-flex items-center gap-2 rounded-md bg-ink-950 px-3 py-1.5 font-mono font-bold tracking-wider transition hover:bg-black/60"
            @click="copy(data.referralCode, 'code')">
            {{ data.referralCode }}
            <Icon :name="copied === 'code' ? 'check' : 'copy'" :size="14" class="text-ink-300" />
          </button>
        </div>
      </section>

      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="users" :size="14" /> Friends invited</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums">{{ data.invited.length }}</p>
        </div>
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="gift" :size="14" /> Earned (demo)</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums text-accent">{{ formatUsd(data.totalEarnedCents) }}</p>
        </div>
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="trending" :size="14" /> Per referral</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums">
            {{ data.invited.length ? formatUsd(Math.round(data.totalEarnedCents / data.invited.length)) : "—" }}
          </p>
        </div>
      </div>

      <!-- How it works -->
      <section>
        <h2 class="mb-3 text-lg font-bold">How it works</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <div v-for="(step, i) in steps" :key="step.title" class="panel relative overflow-hidden p-5">
            <span class="absolute -right-2 -top-4 text-7xl font-black italic text-white/[0.04]">{{ i + 1 }}</span>
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-800 text-accent"><Icon :name="step.icon" :size="18" /></span>
            <p class="mt-4 font-bold">{{ step.title }}</p>
            <p class="mt-1 text-sm text-ink-300">{{ step.text }}</p>
          </div>
        </div>
      </section>

      <!-- Invited -->
      <section>
        <h2 class="mb-3 text-lg font-bold">Invited friends</h2>
        <div class="overflow-hidden rounded-lg shadow-card">
          <div v-if="data.invited.length === 0" class="flex flex-col items-center gap-2 bg-ink-700 px-6 py-10 text-center">
            <Icon name="users" :size="26" class="text-ink-400" />
            <p class="font-bold">No one yet</p>
            <p class="text-sm text-ink-300">Share your link above to get started.</p>
          </div>
          <div
            v-for="(friend, i) in data.invited"
            :key="friend.id"
            class="flex items-center gap-3 px-5 py-3 text-sm"
            :class="i % 2 ? 'bg-ink-800' : 'bg-ink-700'"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-ink-600 text-xs font-bold">{{ initials(friend.displayName) }}</span>
            <span class="flex-1 font-semibold">{{ friend.displayName }}</span>
            <span class="text-xs text-ink-300">{{ new Date(friend.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
