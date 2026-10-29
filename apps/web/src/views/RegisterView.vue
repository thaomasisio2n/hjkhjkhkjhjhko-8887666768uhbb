<script setup lang="ts">
import { PASSWORD_LENGTH, USERNAME_LENGTH } from "@novaspin/shared";
import { computed, ref, watch } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { api } from "../lib/api";
import { apiErrorMessage, formatUsd } from "../lib/format";
import { t } from "../i18n";
import AuthShell from "../components/AuthShell.vue";
import Icon from "../components/Icon.vue";

type Lookup =
  | { state: "idle" | "checking" | "invalid" }
  | { state: "valid"; referrerName: string; welcomeBonusCents: number };

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const displayName = ref("");
const refFromLink = typeof route.query.ref === "string" ? route.query.ref.trim().toUpperCase() : "";
const referralCode = ref(refFromLink);
const showReferral = ref(!!refFromLink);
const lookup = ref<Lookup>({ state: "idle" });
const error = ref("");
const loading = ref(false);

let timer: ReturnType<typeof setTimeout> | undefined;
let requestId = 0;

// Check the code as the user types (debounced) so a typo is caught before submit.
watch(
  referralCode,
  (raw) => {
    const code = raw.trim().toUpperCase();
    if (raw !== code) {
      referralCode.value = code; // re-runs this watcher with the normalized value
      return;
    }
    clearTimeout(timer);
    if (!code) {
      lookup.value = { state: "idle" };
      return;
    }
    lookup.value = { state: "checking" };
    const id = ++requestId;
    timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/referrals/lookup/${encodeURIComponent(code)}`);
        if (id === requestId) lookup.value = { state: "valid", ...data };
      } catch {
        if (id === requestId) lookup.value = { state: "invalid" };
      }
    }, 300);
  },
  { immediate: true }
);

const invitedBy = computed(() => (lookup.value.state === "valid" ? lookup.value : null));

// The operator can pause sign-ups (DISABLE_REGISTRATION); say so up front.
const registrationOpen = ref(true);
api
  .get("/config")
  .then(({ data }) => (registrationOpen.value = data.registrationOpen !== false))
  .catch(() => {});

const blocked = computed(
  () => !registrationOpen.value || lookup.value.state === "checking" || lookup.value.state === "invalid"
);

async function submit() {
  if (blocked.value) return;
  error.value = "";
  loading.value = true;
  try {
    await auth.register({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
      referralCode: referralCode.value.trim() || undefined,
    });
    router.push({ name: "lobby" });
  } catch (e) {
    error.value = apiErrorMessage(e, t("auth.registerFailed"));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell :title="t('auth.registerTitle')" :subtitle="t('auth.registerSubtitle')">
    <div
      v-if="invitedBy && refFromLink"
      class="mb-5 flex items-center gap-3 rounded-lg border border-accent/25 bg-accent/10 p-3"
    >
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
        <Icon name="gift" :size="18" />
      </span>
      <p class="text-sm leading-snug">
        {{ t("auth.invitedBanner", { name: invitedBy.referrerName, amount: formatUsd(invitedBy.welcomeBonusCents) }) }}
      </p>
    </div>

    <div v-if="!registrationOpen" class="mb-5 flex items-start gap-3 rounded-lg border border-amber-400/25 bg-amber-400/10 p-3" role="status">
      <Icon name="lock" :size="18" class="mt-0.5 shrink-0 text-amber-300" />
      <div class="text-sm leading-snug">
        <p class="font-bold">{{ t("auth.registrationClosedTitle") }}</p>
        <p class="mt-0.5 text-ink-300">{{ t("auth.registrationClosedText") }}</p>
      </div>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="reg-name" class="field-label">{{ t("auth.username") }}</label>
        <input id="reg-name" v-model="displayName" type="text" autocomplete="nickname" :minlength="USERNAME_LENGTH.min" :maxlength="USERNAME_LENGTH.max" required class="field" />
      </div>
      <div>
        <label for="reg-email" class="field-label">{{ t("auth.email") }}</label>
        <input id="reg-email" v-model="email" type="email" autocomplete="email" required class="field" />
      </div>
      <div>
        <label for="reg-password" class="field-label">{{ t("auth.password") }}</label>
        <input id="reg-password" v-model="password" type="password" autocomplete="new-password" :minlength="PASSWORD_LENGTH.min" :maxlength="PASSWORD_LENGTH.max" required class="field" />
        <p class="mt-1.5 text-xs text-ink-400">{{ t("auth.passwordHint") }}</p>
      </div>

      <div>
        <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-300 hover:text-white"
          :aria-expanded="showReferral" @click="showReferral = !showReferral">
          {{ t("auth.referralOptional") }}
          <Icon name="chevron-down" :size="14" class="transition" :class="{ 'rotate-180': showReferral }" />
        </button>
        <template v-if="showReferral">
          <div class="relative mt-2">
            <input
              v-model.trim="referralCode"
              type="text"
              :aria-label="t('auth.referralCode')"
              placeholder="e.g. DEMO0001"
              autocapitalize="characters"
              spellcheck="false"
              class="field pr-10 font-mono uppercase tracking-wider"
              :class="{
                '!border-accent/60': lookup.state === 'valid',
                '!border-red-500/60': lookup.state === 'invalid',
              }"
            />
            <span class="absolute right-3 top-1/2 -translate-y-1/2">
              <span v-if="lookup.state === 'checking'" class="block h-4 w-4 animate-spin rounded-full border-2 border-ink-500 border-t-white" />
              <Icon v-else-if="lookup.state === 'valid'" name="check" :size="18" :stroke="3" class="text-accent" />
              <Icon v-else-if="lookup.state === 'invalid'" name="x" :size="18" :stroke="3" class="text-red-400" />
            </span>
          </div>
          <p v-if="invitedBy" class="mt-1.5 text-xs font-semibold text-accent">{{ t("auth.invitedBy", { name: invitedBy.referrerName }) }}</p>
          <p v-else-if="lookup.state === 'invalid'" class="mt-1.5 text-xs font-semibold text-red-300">
            {{ t("auth.codeInvalid") }}
          </p>
        </template>
      </div>

      <p v-if="error" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error }}</p>

      <button type="submit" :disabled="loading || blocked" class="btn-accent h-12 w-full text-base">
        {{ loading ? t("auth.creatingAccount") : t("auth.createAccount") }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-ink-300">
      {{ t("auth.haveAccount") }}
      <RouterLink to="/login" class="font-bold text-white hover:underline">{{ t("auth.signInLink") }}</RouterLink>
    </p>
  </AuthShell>
</template>
