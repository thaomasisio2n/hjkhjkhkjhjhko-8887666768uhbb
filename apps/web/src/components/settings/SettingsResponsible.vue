<script setup lang="ts">
import { BREAK_DURATIONS, DEPOSIT_LIMIT, type BreakDuration } from "@novaspin/shared";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useUiStore } from "../../stores/ui";
import { useWalletStore } from "../../stores/wallet";
import { api } from "../../lib/api";
import { apiErrorMessage, formatUsd } from "../../lib/format";
import { formatDuration, sessionStart } from "../../lib/session";
import { intlLocale, t } from "../../i18n";
import Icon from "../Icon.vue";
import SharedLock from "./SharedLock.vue";
import ModalDialog from "../ModalDialog.vue";

const auth = useAuthStore();
const ui = useUiStore();
const wallet = useWalletStore();
const toast = useToastStore();
const router = useRouter();

// --- Deposit limit --------------------------------------------------------
const limitInput = ref<number | "">("");
const savingLimit = ref(false);
watch(
  () => wallet.depositLimitCents,
  (cents) => (limitInput.value = cents ? cents / 100 : ""),
  { immediate: true }
);
const limitInputCents = computed(() => Math.round(Number(limitInput.value || 0) * 100));
const limitUsage = computed(() =>
  wallet.depositLimitCents ? Math.min(100, (wallet.depositedTodayCents / wallet.depositLimitCents) * 100) : 0
);

async function saveLimit(cents: number | null) {
  savingLimit.value = true;
  try {
    await wallet.setDepositLimit(cents);
    toast.push(cents ? t("toasts.limitSet", { amount: formatUsd(cents) }) : t("toasts.limitRemoved"), "success", "shield");
  } catch (e) {
    toast.push(apiErrorMessage(e, t("toasts.limitFailed")), "error");
  } finally {
    savingLimit.value = false;
  }
}

// --- Reality check --------------------------------------------------------
const REALITY_OPTIONS = [0, 15, 30, 60];
const started = sessionStart();
const now = ref(Date.now());
const clock = setInterval(() => (now.value = Date.now()), 30_000);
onBeforeUnmount(() => clearInterval(clock));
const sessionLength = computed(() => formatDuration(now.value - started));

// --- Break in play --------------------------------------------------------
const BREAK_OPTIONS = Object.keys(BREAK_DURATIONS) as BreakDuration[];
const breakChoice = ref<BreakDuration>("24h");
const confirmingBreak = ref(false);
const startingBreak = ref(false);
const breakEnds = computed(() =>
  new Date(Date.now() + BREAK_DURATIONS[breakChoice.value] * 3600_000).toLocaleString(intlLocale(), {
    dateStyle: "medium",
    timeStyle: "short",
  })
);

async function startBreak() {
  startingBreak.value = true;
  try {
    const { data } = await api.post("/auth/break", { duration: breakChoice.value });
    confirmingBreak.value = false;
    auth.logout({ remote: false });
    router.push({ name: "login", query: { break: data.until } });
  } catch (e) {
    toast.push(apiErrorMessage(e, t("toasts.limitFailed")), "error");
  } finally {
    startingBreak.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 lg:grid-cols-2">
      <SharedLock>
        <div class="panel p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-bold">{{ t("settings.limitTitle") }}</p>
              <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.limitText") }}</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" :class="wallet.depositLimitCents ? 'bg-accent/15 text-accent' : 'bg-ink-600 text-ink-300'">
              {{ wallet.depositLimitCents ? formatUsd(wallet.depositLimitCents) : t("settings.noLimit") }}
            </span>
          </div>

          <div v-if="wallet.depositLimitCents" class="mt-4">
            <div class="flex justify-between text-xs font-semibold text-ink-300">
              <span>{{ t("settings.limitUsed") }}</span>
              <span class="tabular-nums">{{ formatUsd(wallet.depositedTodayCents) }} / {{ formatUsd(wallet.depositLimitCents) }}</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
              <div class="h-full rounded-full transition-all" :class="limitUsage >= 100 ? 'bg-red-400' : 'bg-accent'" :style="{ width: `${limitUsage}%` }" />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="cents in DEPOSIT_LIMIT.presetsCents"
              :key="cents"
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-bold transition"
              :class="wallet.depositLimitCents === cents ? 'bg-ink-500 text-white' : 'bg-ink-800 text-ink-300 hover:bg-ink-600 hover:text-white'"
              :disabled="savingLimit"
              @click="saveLimit(cents)"
            >
              {{ formatUsd(cents).replace(".00", "") }}
            </button>
          </div>
          <form class="mt-3 flex gap-2" @submit.prevent="saveLimit(limitInputCents)">
            <div class="relative flex-1">
              <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">$</span>
              <input v-model.number="limitInput" type="number" min="10" step="1" inputmode="numeric" :aria-label="t('settings.customAria')" :placeholder="t('settings.customAmount')" class="field pl-7" />
            </div>
            <button type="submit" class="btn-blue" :disabled="savingLimit || limitInputCents < DEPOSIT_LIMIT.minCents">{{ t("settings.set") }}</button>
            <button v-if="wallet.depositLimitCents" type="button" class="btn-ghost" :disabled="savingLimit" @click="saveLimit(null)">{{ t("settings.remove") }}</button>
          </form>
          <p class="mt-2 text-xs text-ink-400">{{ t("settings.limitMin") }}</p>
        </div>
      </SharedLock>

      <div class="panel p-5">
        <p class="font-bold">{{ t("settings.realityTitle") }}</p>
        <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.realityText") }}</p>
        <div class="mt-4 inline-flex rounded-full bg-ink-900 p-1" role="radiogroup" :aria-label="t('settings.realityAria')">
          <button
            v-for="m in REALITY_OPTIONS"
            :key="m"
            type="button"
            role="radio"
            :aria-checked="ui.realityCheckMinutes === m"
            class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
            :class="ui.realityCheckMinutes === m ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'"
            @click="ui.setRealityCheck(m)"
          >
            {{ m ? t("settings.minutes", { count: m }) : t("settings.off") }}
          </button>
        </div>
        <div class="mt-5 flex items-center gap-3 rounded-lg bg-ink-800 p-3">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blue/15 text-blue-hover"><Icon name="clock" :size="17" /></span>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">{{ t("settings.currentSession") }}</p>
            <p class="font-bold">{{ sessionLength }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Break in play -->
    <SharedLock>
      <section class="panel p-5">
        <p class="flex items-center gap-2 font-bold"><Icon name="clock" :size="16" class="text-ink-300" /> {{ t("settings.breakTitle") }}</p>
        <p class="mt-0.5 max-w-2xl text-sm text-ink-300">{{ t("settings.breakText") }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <div class="inline-flex flex-wrap rounded-full bg-ink-900 p-1" role="radiogroup" :aria-label="t('settings.breakTitle')">
            <button
              v-for="option in BREAK_OPTIONS"
              :key="option"
              type="button"
              role="radio"
              :aria-checked="breakChoice === option"
              class="rounded-full px-4 py-1.5 text-sm font-semibold transition"
              :class="breakChoice === option ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'"
              @click="breakChoice = option"
            >
              {{ t(`settings.breakDurations.${option}`) }}
            </button>
          </div>
          <button type="button" class="btn bg-amber-400/15 text-amber-200 hover:bg-amber-400/25" @click="confirmingBreak = true">
            {{ t("settings.breakCta") }}
          </button>
        </div>
      </section>
    </SharedLock>

    <ModalDialog
      v-if="confirmingBreak"
      icon="clock"
      :title="t('settings.breakConfirmTitle', { duration: t(`settings.breakDurations.${breakChoice}`) })"
      @close="confirmingBreak = false"
    >
      {{ t("settings.breakConfirmText", { date: breakEnds }) }}
      <template #actions>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="btn-ghost" @click="confirmingBreak = false">{{ t("common.cancel") }}</button>
          <button type="button" class="btn bg-amber-400 text-ink-950 hover:bg-amber-300" :disabled="startingBreak" @click="startBreak">
            {{ t("settings.breakConfirm") }}
          </button>
        </div>
      </template>
    </ModalDialog>
  </div>
</template>
