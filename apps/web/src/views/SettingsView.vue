<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { useWalletStore } from "../stores/wallet";
import { api } from "../lib/api";
import { apiErrorMessage, initials } from "../lib/format";
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
