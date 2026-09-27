<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { api } from "../../lib/api";
import { apiErrorMessage, timeAgo } from "../../lib/format";
import { describeUserAgent } from "../../lib/userAgent";
import { t, tc } from "../../i18n";
import Icon from "../Icon.vue";

interface SessionRow {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

const auth = useAuthStore();
const toast = useToastStore();

// --- Password -------------------------------------------------------------
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
    const { data } = await api.post("/auth/password", { currentPassword: currentPassword.value, newPassword: newPassword.value });
    currentPassword.value = newPassword.value = confirmPassword.value = "";
    toast.push(t("toasts.passwordChanged"), "success", "lock");
    if (data.signedOut) toast.push(tc("toasts.othersRevoked", data.signedOut), "info", "logout");
    loadSessions();
  } catch (e) {
    passwordError.value = apiErrorMessage(e, t("settings.passwordFailed"));
  } finally {
    savingPassword.value = false;
  }
}

// --- Two-factor ----------------------------------------------------------
const setup = ref<{ secret: string; qrSvg: string } | null>(null);
const code = ref("");
const busy2fa = ref(false);
const error2fa = ref("");
const totpEnabled = computed(() => !!auth.user?.totpEnabled);
const disabling = ref(false);
const groupedSecret = computed(() => setup.value?.secret.match(/.{1,4}/g)?.join(" ") ?? "");

async function startSetup() {
  error2fa.value = "";
  busy2fa.value = true;
  try {
    const { data } = await api.post("/auth/2fa/setup");
    setup.value = data;
    code.value = "";
  } catch (e) {
    error2fa.value = apiErrorMessage(e, t("settings.profileFailed"));
  } finally {
    busy2fa.value = false;
  }
}

async function submitCode() {
  error2fa.value = "";
  busy2fa.value = true;
  try {
    const path = totpEnabled.value ? "/auth/2fa/disable" : "/auth/2fa/enable";
    const { data } = await api.post(path, { code: code.value });
    if (auth.user) auth.user.totpEnabled = data.totpEnabled;
    toast.push(t(data.totpEnabled ? "toasts.twoFactorEnabled" : "toasts.twoFactorDisabled"), "success", "shield");
    setup.value = null;
    disabling.value = false;
    code.value = "";
  } catch (e) {
    error2fa.value = apiErrorMessage(e, t("auth.codeWrong"));
  } finally {
    busy2fa.value = false;
  }
}

function cancel2fa() {
  setup.value = null;
  disabling.value = false;
  code.value = "";
  error2fa.value = "";
}

async function copySecret() {
  if (!setup.value) return;
  try {
    await navigator.clipboard.writeText(setup.value.secret);
    toast.push(t("toasts.keyCopied"), "success", "copy");
  } catch {
    toast.push(t("toasts.clipboardBlocked"), "error");
  }
}

// --- Sessions ------------------------------------------------------------
const sessions = ref<SessionRow[]>([]);
const loadingSessions = ref(true);

async function loadSessions() {
  try {
    const { data } = await api.get("/auth/sessions");
    sessions.value = data.sessions;
  } finally {
    loadingSessions.value = false;
  }
}

async function revoke(id: string) {
  await api.delete(`/auth/sessions/${id}`);
  sessions.value = sessions.value.filter((s) => s.id !== id);
  toast.push(t("toasts.sessionRevoked"), "success", "logout");
}

async function revokeOthers() {
  const { data } = await api.post("/auth/sessions/revoke-others");
  toast.push(tc("toasts.othersRevoked", data.revoked), "success", "logout");
  loadSessions();
}

onMounted(loadSessions);
</script>

<template>
  <div class="space-y-6">
    <!-- Password -->
    <section>
      <h2 class="mb-3 text-lg font-bold">{{ t("settings.changePassword") }}</h2>
      <form class="panel grid gap-4 p-5 sm:grid-cols-3" @submit.prevent="changePassword">
        <div>
          <label for="pw-current" class="field-label">{{ t("settings.currentPassword") }}</label>
          <input id="pw-current" v-model="currentPassword" type="password" autocomplete="current-password" required class="field" />
        </div>
        <div>
          <label for="pw-new" class="field-label">{{ t("settings.newPassword") }}</label>
          <input id="pw-new" v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required class="field" />
        </div>
        <div>
          <label for="pw-confirm" class="field-label">{{ t("settings.confirmPassword") }}</label>
          <input id="pw-confirm" v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required class="field"
            :class="{ '!border-red-500/60': mismatch }" />
        </div>
        <div class="flex flex-col gap-3 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs" :class="mismatch ? 'font-semibold text-red-300' : 'text-ink-400'">
            {{ mismatch ? t("settings.passwordsMismatch") : t("settings.passwordHint") }}
          </p>
          <button type="submit" class="btn-blue" :disabled="savingPassword || mismatch || !currentPassword || newPassword.length < 8">
            <Icon name="lock" :size="16" /> {{ savingPassword ? t("settings.updating") : t("settings.changePassword") }}
          </button>
        </div>
        <p v-if="passwordError" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 sm:col-span-3">{{ passwordError }}</p>
      </form>
    </section>

    <!-- Two-factor -->
    <section class="panel p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="max-w-xl">
          <p class="flex items-center gap-2 font-bold"><Icon name="shield" :size="16" class="text-ink-300" /> {{ t("settings.twoFactorTitle") }}</p>
          <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.twoFactorText") }}</p>
        </div>
        <span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="totpEnabled ? 'bg-accent/15 text-accent' : 'bg-ink-600 text-ink-300'">
          {{ totpEnabled ? t("settings.twoFactorOn") : t("settings.twoFactorOff") }}
        </span>
      </div>

      <!-- Setup: QR + key + code -->
      <form v-if="setup" class="mt-5 grid gap-5 md:grid-cols-[auto_1fr]" @submit.prevent="submitCode">
        <!-- eslint-disable-next-line vue/no-v-html -- trusted SVG generated by our own API -->
        <div class="h-44 w-44 overflow-hidden rounded-lg bg-white p-2 [&>svg]:h-full [&>svg]:w-full" v-html="setup.qrSvg" />
        <div class="space-y-4">
          <p class="text-sm text-ink-300">{{ t("settings.twoFactorScan") }}</p>
          <div>
            <span class="field-label">{{ t("settings.twoFactorKey") }}</span>
            <button type="button" class="inline-flex max-w-full items-center gap-2 rounded-md bg-ink-950 px-3 py-2 font-mono text-sm font-bold tracking-wider hover:bg-black/60"
              data-testid="totp-secret" :data-secret="setup.secret" @click="copySecret">
              <span class="truncate">{{ groupedSecret }}</span> <Icon name="copy" :size="14" class="text-ink-300" />
            </button>
          </div>
          <div>
            <label for="totp-code" class="field-label">{{ t("settings.twoFactorCode") }}</label>
            <div class="flex gap-2">
              <input id="totp-code" v-model.trim="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}" required
                class="field w-40 text-center font-mono text-lg tracking-[0.3em]" />
              <button type="submit" class="btn-accent" :disabled="busy2fa || code.length !== 6">{{ t("settings.twoFactorEnable") }}</button>
              <button type="button" class="btn-ghost" @click="cancel2fa">{{ t("common.cancel") }}</button>
            </div>
          </div>
          <p v-if="error2fa" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error2fa }}</p>
        </div>
      </form>

      <!-- Disable: confirm with a code -->
      <form v-else-if="disabling" class="mt-5 space-y-3" @submit.prevent="submitCode">
        <p class="text-sm text-ink-300">{{ t("settings.twoFactorDisableText") }}</p>
        <div class="flex flex-wrap gap-2">
          <input v-model.trim="code" :aria-label="t('settings.twoFactorCode')" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}" required
            class="field w-40 text-center font-mono text-lg tracking-[0.3em]" />
          <button type="submit" class="btn bg-red-500/15 text-red-300 hover:bg-red-500/25" :disabled="busy2fa || code.length !== 6">
            {{ t("settings.twoFactorDisable") }}
          </button>
          <button type="button" class="btn-ghost" @click="cancel2fa">{{ t("common.cancel") }}</button>
        </div>
        <p v-if="error2fa" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error2fa }}</p>
      </form>

      <div v-else class="mt-4">
        <button v-if="!totpEnabled" type="button" class="btn-blue" :disabled="busy2fa" @click="startSetup">
          <Icon name="shield" :size="16" /> {{ t("settings.twoFactorSetup") }}
        </button>
        <button v-else type="button" class="btn-ghost" @click="disabling = true">{{ t("settings.twoFactorDisable") }}</button>
      </div>
    </section>

    <!-- Sessions -->
    <section>
      <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold">{{ t("settings.sessionsTitle") }}</h2>
          <p class="text-sm text-ink-300">{{ t("settings.sessionsText") }}</p>
        </div>
        <button v-if="sessions.length > 1" type="button" class="btn-ghost" @click="revokeOthers">
          <Icon name="logout" :size="16" /> {{ t("settings.revokeOthers") }}
        </button>
      </div>
      <div class="overflow-hidden rounded-lg shadow-card">
        <div v-if="loadingSessions" class="h-20 animate-pulse bg-ink-700" />
        <div
          v-for="(s, i) in sessions"
          :key="s.id"
          class="flex items-center gap-4 px-5 py-4"
          :class="i % 2 ? 'bg-ink-800' : 'bg-ink-700'"
          data-testid="session-row"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" :class="s.current ? 'bg-accent/15 text-accent' : 'bg-ink-600 text-ink-300'">
            <Icon :name="s.current ? 'check' : 'user'" :size="18" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2 font-semibold">
              {{ describeUserAgent(s.userAgent) }}
              <span v-if="s.current" class="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">{{ t("settings.thisDevice") }}</span>
            </p>
            <p class="truncate text-xs text-ink-400">
              {{ s.ip ?? "—" }} · {{ t("settings.lastActive", { time: timeAgo(s.lastSeenAt) }) }} · {{ t("settings.signedIn", { time: timeAgo(s.createdAt) }) }}
            </p>
          </div>
          <button v-if="!s.current" type="button" class="btn-ghost h-9 px-3 text-xs" @click="revoke(s.id)">{{ t("settings.revoke") }}</button>
        </div>
      </div>
    </section>
  </div>
</template>
