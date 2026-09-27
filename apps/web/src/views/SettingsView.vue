<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { useWalletStore } from "../stores/wallet";
import { api } from "../lib/api";
import { apiErrorMessage, formatUsd, initials } from "../lib/format";
import { formatDuration, sessionStart } from "../lib/session";
import type { IconName } from "../lib/icons";
import Icon from "../components/Icon.vue";

const auth = useAuthStore();
const ui = useUiStore();
const wallet = useWalletStore();
const toast = useToastStore();
const router = useRouter();

onMounted(() => {
  auth.fetchMe().catch(() => {});
  wallet.fetchBalance().catch(() => {});
});

const memberSince = computed(() =>
  auth.user?.createdAt
    ? new Date(auth.user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—"
);

const stats = computed<{ label: string; value: string; icon: IconName; wide?: boolean }[]>(() => [
  { label: "Balance", value: ui.money(wallet.balanceCents), icon: "wallet", wide: true },
  { label: "Favourites", value: String(ui.favourites.length), icon: "heart" },
  { label: "Played", value: String(ui.recent.length), icon: "history" },
]);

const preferences = computed(() => [
  {
    title: "Streamer mode",
    text: "Hide your balance and amounts everywhere on screen — useful when recording or streaming.",
    on: ui.streamerMode,
    toggle: () => ui.toggleStreamerMode(),
  },
  {
    title: "Compact sidebar",
    text: "Collapse the desktop sidebar to icons only.",
    on: ui.sidebarCollapsed,
    toggle: () => ui.toggleSidebar(),
    desktopOnly: true,
  },
]);

// Profile
const displayName = ref(auth.user?.displayName ?? "");
const savingProfile = ref(false);
const profileError = ref("");
watch(
  () => auth.user?.displayName,
  (name) => {
    if (name && !savingProfile.value) displayName.value = name;
  }
);
const profileDirty = computed(() => displayName.value.trim() !== (auth.user?.displayName ?? ""));

async function saveProfile() {
  profileError.value = "";
  savingProfile.value = true;
  try {
    const { data } = await api.patch("/auth/me", { displayName: displayName.value.trim() });
    auth.user = data;
    displayName.value = data.displayName;
    toast.push("Profile updated", "success", "user");
  } catch (e) {
    profileError.value = apiErrorMessage(e, "Couldn't save your profile.");
  } finally {
    savingProfile.value = false;
  }
}

// Password
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const savingPassword = ref(false);
const passwordError = ref("");
const mismatch = computed(() => !!confirmPassword.value && newPassword.value !== confirmPassword.value);

async function changePassword() {
  if (mismatch.value) return;
  passwordError.value = "";
  savingPassword.value = true;
  try {
    await api.post("/auth/password", { currentPassword: currentPassword.value, newPassword: newPassword.value });
    currentPassword.value = newPassword.value = confirmPassword.value = "";
    toast.push("Password changed", "success", "lock");
  } catch (e) {
    passwordError.value = apiErrorMessage(e, "Couldn't change your password.");
  } finally {
    savingPassword.value = false;
  }
}

// Responsible play
const LIMIT_PRESETS = [10_000, 50_000, 100_000, 500_000];
const REALITY_OPTIONS = [0, 15, 30, 60];
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
    toast.push(cents ? `Daily deposit limit set to ${formatUsd(cents)}` : "Daily deposit limit removed", "success", "shield");
  } catch (e) {
    toast.push(apiErrorMessage(e, "Couldn't update your limit."), "error");
  } finally {
    savingLimit.value = false;
  }
}

const started = sessionStart();
const now = ref(Date.now());
const clock = setInterval(() => (now.value = Date.now()), 30_000);
onBeforeUnmount(() => clearInterval(clock));
const sessionLength = computed(() => formatDuration(now.value - started));

function clearRecent() {
  ui.clearRecent();
  toast.push("Recently played cleared", "success", "history");
}

function clearFavourites() {
  ui.clearFavourites();
  toast.push("Favourites cleared", "success", "heart");
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="page space-y-6 py-6 sm:py-8">
    <h1 class="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
      <Icon name="settings" :size="22" class="text-ink-300" /> Settings
    </h1>

    <!-- Profile -->
    <section class="panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
      <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-600 text-xl font-extrabold text-accent-ink">
        {{ initials(auth.user?.displayName) }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-lg font-extrabold">{{ auth.user?.displayName ?? "Player" }}</p>
        <p class="truncate text-sm text-ink-300">{{ auth.user?.email }}</p>
        <p class="mt-1 text-xs text-ink-400">Member since {{ memberSince }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:w-[420px] sm:grid-cols-3">
        <div v-for="s in stats" :key="s.label" class="rounded-lg bg-ink-800 px-3 py-3" :class="{ 'col-span-2 sm:col-span-1': s.wide }">
          <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            <Icon :name="s.icon" :size="12" /> <span class="truncate">{{ s.label }}</span>
          </p>
          <p class="mt-1 truncate font-extrabold tabular-nums">{{ s.value }}</p>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Preferences -->
      <section>
        <h2 class="mb-3 text-lg font-bold">Preferences</h2>
        <div class="panel divide-y divide-ink-600">
          <div v-for="p in preferences" :key="p.title" class="items-center gap-4 p-5" :class="p.desktopOnly ? 'hidden lg:flex' : 'flex'">
            <div class="flex-1">
              <p class="font-bold">{{ p.title }}</p>
              <p class="mt-0.5 text-sm text-ink-300">{{ p.text }}</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="p.on"
              :aria-label="p.title"
              class="relative h-7 w-12 shrink-0 rounded-full transition"
              :class="p.on ? 'bg-accent' : 'bg-ink-500'"
              @click="p.toggle"
            >
              <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" :class="p.on ? 'left-6' : 'left-1'" />
            </button>
          </div>
        </div>
      </section>

      <!-- Profile -->
      <section>
        <h2 class="mb-3 text-lg font-bold">Profile</h2>
        <form class="panel space-y-4 p-5" @submit.prevent="saveProfile">
          <div>
            <label for="set-name" class="field-label">Username</label>
            <input id="set-name" v-model="displayName" type="text" minlength="2" maxlength="40" required autocomplete="nickname" class="field" />
            <p class="mt-1.5 text-xs text-ink-400">Shown to friends you invite and in the top bar.</p>
          </div>
          <div>
            <label for="set-email" class="field-label">Email</label>
            <input id="set-email" :value="auth.user?.email ?? ''" readonly class="field cursor-not-allowed text-ink-400" />
          </div>
          <p v-if="profileError" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ profileError }}</p>
          <button type="submit" class="btn-blue" :disabled="!profileDirty || savingProfile || displayName.trim().length < 2">
            {{ savingProfile ? "Saving…" : "Save changes" }}
          </button>
        </form>
      </section>
    </div>

    <!-- Security -->
    <section>
      <h2 class="mb-3 text-lg font-bold">Security</h2>
      <form class="panel grid gap-4 p-5 sm:grid-cols-3" @submit.prevent="changePassword">
        <div>
          <label for="pw-current" class="field-label">Current password</label>
          <input id="pw-current" v-model="currentPassword" type="password" autocomplete="current-password" required class="field" />
        </div>
        <div>
          <label for="pw-new" class="field-label">New password</label>
          <input id="pw-new" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required class="field" />
        </div>
        <div>
          <label for="pw-confirm" class="field-label">Confirm new password</label>
          <input id="pw-confirm" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required class="field"
            :class="{ '!border-red-500/60': mismatch }" />
        </div>
        <div class="flex flex-col gap-3 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs" :class="mismatch ? 'font-semibold text-red-300' : 'text-ink-400'">
            {{ mismatch ? "Passwords don't match." : "At least 8 characters. You'll stay signed in on this device." }}
          </p>
          <button type="submit" class="btn-blue" :disabled="savingPassword || mismatch || !currentPassword || newPassword.length < 8">
            <Icon name="lock" :size="16" /> {{ savingPassword ? "Updating…" : "Change password" }}
          </button>
        </div>
        <p v-if="passwordError" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 sm:col-span-3">{{ passwordError }}</p>
      </form>
    </section>

    <!-- Responsible play -->
    <section>
      <h2 class="mb-3 flex items-center gap-2 text-lg font-bold"><Icon name="shield" :size="18" class="text-ink-300" /> Responsible play</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="panel p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-bold">Daily deposit limit</p>
              <p class="mt-0.5 text-sm text-ink-300">Caps deposits in any rolling 24 hours. The API enforces it.</p>
            </div>
            <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" :class="wallet.depositLimitCents ? 'bg-accent/15 text-accent' : 'bg-ink-600 text-ink-300'">
              {{ wallet.depositLimitCents ? formatUsd(wallet.depositLimitCents) : "No limit" }}
            </span>
          </div>

          <div v-if="wallet.depositLimitCents" class="mt-4">
            <div class="flex justify-between text-xs font-semibold text-ink-300">
              <span>Used in the last 24 h</span>
              <span class="tabular-nums">{{ formatUsd(wallet.depositedTodayCents) }} / {{ formatUsd(wallet.depositLimitCents) }}</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
              <div class="h-full rounded-full transition-all" :class="limitUsage >= 100 ? 'bg-red-400' : 'bg-accent'" :style="{ width: `${limitUsage}%` }" />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="cents in LIMIT_PRESETS"
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
              <input v-model.number="limitInput" type="number" min="10" step="1" inputmode="numeric" aria-label="Custom daily limit in USD" placeholder="Custom amount" class="field pl-7" />
            </div>
            <button type="submit" class="btn-blue" :disabled="savingLimit || limitInputCents < 1000">Set</button>
            <button v-if="wallet.depositLimitCents" type="button" class="btn-ghost" :disabled="savingLimit" @click="saveLimit(null)">Remove</button>
          </form>
          <p class="mt-2 text-xs text-ink-400">Minimum $10.</p>
        </div>

        <div class="panel p-5">
          <p class="font-bold">Reality check</p>
          <p class="mt-0.5 text-sm text-ink-300">Get a reminder of how long you've been here, at a set interval.</p>
          <div class="mt-4 inline-flex rounded-full bg-ink-900 p-1" role="radiogroup" aria-label="Reality check interval">
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
              {{ m ? `${m} min` : "Off" }}
            </button>
          </div>
          <div class="mt-5 flex items-center gap-3 rounded-lg bg-ink-800 p-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-blue/15 text-blue-hover"><Icon name="clock" :size="17" /></span>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-400">Current session</p>
              <p class="font-bold">{{ sessionLength }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Data -->
    <section>
      <h2 class="mb-3 text-lg font-bold">Browser data</h2>
      <div class="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <p class="flex-1 text-sm text-ink-300">
          Favourites, recently played and your preferences are stored in this browser only.
        </p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-ghost" :disabled="!ui.recent.length" @click="clearRecent">
            <Icon name="history" :size="16" /> Clear recent
          </button>
          <button type="button" class="btn-ghost" :disabled="!ui.favourites.length" @click="clearFavourites">
            <Icon name="trash" :size="16" /> Clear favourites
          </button>
          <button type="button" class="btn bg-red-500/15 text-red-300 hover:bg-red-500/25" @click="logout">
            <Icon name="logout" :size="16" /> Log out
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
