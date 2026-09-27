<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "../lib/api";
import { formatDate, formatUsd, timeAgo } from "../lib/format";
import { PALETTES } from "../lib/gameArt";
import type { IconName } from "../lib/icons";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { t } from "../i18n";
import GameEmblem from "../components/GameEmblem.vue";
import Icon from "../components/Icon.vue";
import UserAvatar from "../components/UserAvatar.vue";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  // The latest 100; invitedCount is the full total.
  invited: { id: string; displayName: string; avatar: string | null; createdAt: string }[];
  invitedCount?: number;
  totalEarnedCents: number;
  bonusPerReferralCents: number;
  welcomeBonusCents: number;
}

const ui = useUiStore();
const toast = useToastStore();
const data = ref<ReferralData | null>(null);
const failed = ref(false);
const copied = ref<"link" | "code" | null>(null);
const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

onMounted(async () => {
  try {
    const { data: res } = await api.get("/referrals");
    data.value = res;
  } catch {
    failed.value = true;
  }
});

async function copy(value: string, what: "link" | "code") {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = what;
    toast.push(t(what === "link" ? "toasts.linkCopied" : "toasts.codeCopied"), "success", "copy");
    setTimeout(() => (copied.value = null), 1500);
  } catch {
    toast.push(t("toasts.clipboardBlocked"), "error");
  }
}

const shareText = computed(() =>
  data.value
    ? t("referrals.shareText", { amount: formatUsd(data.value.welcomeBonusCents) })
    : ""
);

const shareTargets = computed(() => {
  if (!data.value) return [];
  const url = encodeURIComponent(data.value.referralLink);
  const text = encodeURIComponent(shareText.value);
  return [
    { id: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${url}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${url}&text=${text}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${text}%20${url}` },
    { id: "email", label: "Email", href: `mailto:?subject=${encodeURIComponent(t("referrals.shareSubject"))}&body=${text}%0A%0A${url}` },
  ] as const;
});

async function nativeShare() {
  if (!data.value) return;
  try {
    await navigator.share({ title: "NovaSpin (demo)", text: shareText.value, url: data.value.referralLink });
  } catch {
    // user closed the share sheet
  }
}

// Only rendered once data has loaded.
const steps = computed<{ icon: IconName; title: string; text: string }[]>(() => [
  { icon: "link", title: t("referrals.step1Title"), text: t("referrals.step1Text") },
  {
    icon: "user",
    title: t("referrals.step2Title"),
    text: t("referrals.step2Text", { amount: formatUsd(data.value?.welcomeBonusCents ?? 0) }),
  },
  {
    icon: "gift",
    title: t("referrals.step3Title"),
    text: t("referrals.step3Text", { amount: formatUsd(data.value?.bonusPerReferralCents ?? 0) }),
  },
]);
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
        <span class="inline-block rounded bg-white px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-900">{{ t("referrals.tag") }}</span>
        <h1 class="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{{ t("referrals.title") }}</h1>
        <p class="mt-2 text-sm text-white/80">
          {{ t("referrals.text") }}
        </p>
        <div v-if="data" class="mt-4 flex flex-wrap gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-bold backdrop-blur">
            <Icon name="gift" :size="14" /> {{ t("referrals.youGet", { amount: formatUsd(data.bonusPerReferralCents) }) }}
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs font-bold backdrop-blur">
            <Icon name="user" :size="14" /> {{ t("referrals.theyGet", { amount: formatUsd(data.welcomeBonusCents) }) }}
          </span>
        </div>
      </div>
    </section>

    <div v-if="failed" class="panel flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Icon name="info" :size="26" class="text-ink-400" />
      <p class="font-bold">{{ t("referrals.loadFailed") }}</p>
      <p class="text-sm text-ink-300">{{ t("referrals.loadFailedHint") }}</p>
    </div>

    <div v-else-if="!data" class="space-y-4">
      <div class="h-40 animate-pulse rounded-lg bg-ink-700" />
      <div class="grid gap-4 sm:grid-cols-3"><div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-ink-700" /></div>
    </div>

    <template v-else>
      <!-- Link + share -->
      <section class="panel p-5 sm:p-6">
        <label for="ref-link" class="field-label">{{ t("referrals.yourLink") }}</label>
        <div class="flex gap-2">
          <input id="ref-link" readonly :value="data.referralLink" class="field min-w-0 flex-1 text-ink-300" @focus="($event.target as HTMLInputElement).select()" />
          <button type="button" class="btn-blue shrink-0" @click="copy(data.referralLink, 'link')">
            <Icon :name="copied === 'link' ? 'check' : 'copy'" :size="16" />
            <span class="hidden sm:inline">{{ copied === "link" ? t("common.copied") : t("common.copy") }}</span>
          </button>
        </div>

        <div class="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3 text-sm">
            <span class="text-ink-300">{{ t("referrals.code") }}</span>
            <button type="button" class="inline-flex items-center gap-2 rounded-md bg-ink-950 px-3 py-1.5 font-mono font-bold tracking-wider transition hover:bg-black/60"
              @click="copy(data.referralCode, 'code')">
              {{ data.referralCode }}
              <Icon :name="copied === 'code' ? 'check' : 'copy'" :size="14" class="text-ink-300" />
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="mr-1 text-sm text-ink-300">{{ t("common.share") }}</span>
            <button v-if="canNativeShare" type="button" class="btn-ghost h-9 px-3" @click="nativeShare">
              <Icon name="arrow-up-right" :size="16" /> {{ t("common.share") }}
            </button>
            <a
              v-for="target in shareTargets"
              :key="target.id"
              :href="target.href"
              target="_blank"
              rel="noopener noreferrer"
              class="flex h-9 w-9 items-center justify-center rounded-md bg-ink-600 text-white transition hover:bg-ink-500"
              :title="t('referrals.shareVia', { target: target.label })"
              :aria-label="t('referrals.shareVia', { target: target.label })"
            >
              <svg v-if="target.id === 'x'" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
              </svg>
              <svg v-else-if="target.id === 'telegram'" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M21.9 4.6 18.7 19.7c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.4 1.2Z" />
              </svg>
              <svg v-else-if="target.id === 'whatsapp'" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
              </svg>
              <Icon v-else name="mail" :size="16" />
            </a>
          </div>
        </div>
      </section>

      <!-- Stats -->
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="users" :size="14" /> {{ t("referrals.friendsInvited") }}</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums">{{ data.invitedCount ?? data.invited.length }}</p>
        </div>
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="gift" :size="14" /> {{ t("referrals.earned") }}</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums text-accent">{{ ui.money(data.totalEarnedCents) }}</p>
        </div>
        <div class="panel p-5">
          <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400"><Icon name="trending" :size="14" /> {{ t("referrals.perFriend") }}</p>
          <p class="mt-2 text-3xl font-extrabold tabular-nums">{{ formatUsd(data.bonusPerReferralCents) }}</p>
        </div>
      </div>

      <!-- How it works -->
      <section>
        <h2 class="mb-3 text-lg font-bold">{{ t("referrals.howItWorks") }}</h2>
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
        <h2 class="mb-3 text-lg font-bold">{{ t("referrals.invitedFriends") }}</h2>
        <div class="overflow-hidden rounded-lg shadow-card">
          <div v-if="data.invited.length === 0" class="flex flex-col items-center gap-2 bg-ink-700 px-6 py-10 text-center">
            <Icon name="users" :size="26" class="text-ink-400" />
            <p class="font-bold">{{ t("referrals.noOne") }}</p>
            <p class="text-sm text-ink-300">{{ t("referrals.noOneHint") }}</p>
          </div>
          <template v-else>
            <div class="hidden grid-cols-[2fr_1.2fr_1fr] gap-4 bg-ink-900 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-400 sm:grid">
              <span>{{ t("referrals.colFriend") }}</span><span>{{ t("referrals.colJoined") }}</span><span class="text-right">{{ t("referrals.colBonus") }}</span>
            </div>
            <div
              v-for="(friend, i) in data.invited"
              :key="friend.id"
              class="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-sm sm:grid-cols-[2fr_1.2fr_1fr] sm:gap-4"
              :class="i % 2 ? 'bg-ink-800' : 'bg-ink-700'"
            >
              <div class="flex min-w-0 items-center gap-3">
                <UserAvatar :name="friend.displayName" :avatar="friend.avatar" :size="32" />
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ friend.displayName }}</p>
                  <p class="text-xs text-ink-400 sm:hidden">{{ timeAgo(friend.createdAt) }}</p>
                </div>
              </div>
              <span class="hidden text-ink-300 sm:block" :title="formatDate(friend.createdAt)">{{ timeAgo(friend.createdAt) }}</span>
              <span class="text-right font-bold tabular-nums text-accent">+{{ ui.money(data.bonusPerReferralCents) }}</span>
            </div>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
