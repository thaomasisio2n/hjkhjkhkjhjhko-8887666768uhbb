<script setup lang="ts">
import { TOTP_DIGITS } from "@novaspin/shared";
import { nextTick, ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { apiErrorBody } from "../lib/api";
import { apiErrorMessage } from "../lib/format";
import { intlLocale, t } from "../i18n";
import AuthShell from "../components/AuthShell.vue";
import Icon from "../components/Icon.vue";

const DEMO_EMAIL = "demo@novaspin.test";
const DEMO_PASSWORD = "demo1234";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const code = ref("");
const step = ref<"credentials" | "totp">("credentials");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);
const codeInput = ref<HTMLInputElement | null>(null);

const breakMessage = (until: string) =>
  t("auth.onBreak", { date: new Date(until).toLocaleString(intlLocale(), { dateStyle: "medium", timeStyle: "short" }) });

// Arriving here after starting a break (or being bounced by one).
const breakUntil = typeof route.query.break === "string" ? route.query.break : null;
const notice = ref(breakUntil && !Number.isNaN(Date.parse(breakUntil)) ? breakMessage(breakUntil) : "");

async function submit() {
  error.value = "";
  notice.value = "";
  loading.value = true;
  try {
    await auth.login({ email: email.value, password: password.value, code: step.value === "totp" ? code.value : undefined });
    router.push({ name: "lobby" });
  } catch (e) {
    const body = apiErrorBody(e);
    if (body?.code === "TOTP_REQUIRED") {
      step.value = "totp";
      await nextTick();
      codeInput.value?.focus();
    } else if (body?.code === "TOTP_INVALID") {
      error.value = t("auth.codeWrong");
      code.value = "";
    } else if (body?.code === "ON_BREAK" && body.until) {
      notice.value = breakMessage(body.until);
    } else {
      error.value = apiErrorMessage(e, t("auth.loginFailed"));
    }
  } finally {
    loading.value = false;
  }
}

function backToCredentials() {
  step.value = "credentials";
  code.value = "";
  error.value = "";
}

function useDemo() {
  email.value = DEMO_EMAIL;
  password.value = DEMO_PASSWORD;
  submit();
}
</script>

<template>
  <AuthShell
    :title="step === 'totp' ? t('auth.twoFactorTitle') : t('auth.signInTitle')"
    :subtitle="step === 'totp' ? t('auth.twoFactorText') : t('auth.signInSubtitle')"
  >
    <p v-if="notice" class="mb-4 flex items-start gap-2 rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-100" role="status">
      <Icon name="clock" :size="16" class="mt-0.5 text-amber-300" /> {{ notice }}
    </p>

    <!-- Step 2: two-factor code -->
    <form v-if="step === 'totp'" class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="login-code" class="field-label">{{ t("auth.code") }}</label>
        <input
          id="login-code"
          ref="codeInput"
          v-model.trim="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="TOTP_DIGITS"
          :pattern="`\\d{${TOTP_DIGITS}}`"
          required
          class="field h-14 text-center font-mono text-2xl tracking-[0.5em]"
        />
      </div>
      <p v-if="error" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error }}</p>
      <button type="submit" :disabled="loading || code.length !== TOTP_DIGITS" class="btn-accent h-12 w-full text-base">
        {{ loading ? t("auth.signingIn") : t("auth.verify") }}
      </button>
      <button type="button" class="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-ink-300 hover:text-white" @click="backToCredentials">
        <Icon name="arrow-left" :size="14" /> {{ t("auth.back") }}
      </button>
    </form>

    <!-- Step 1: email + password -->
    <template v-else>
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label for="login-email" class="field-label">{{ t("auth.email") }}</label>
          <input id="login-email" v-model="email" type="email" autocomplete="email" required class="field" />
        </div>
        <div>
          <label for="login-password" class="field-label">{{ t("auth.password") }}</label>
          <div class="relative">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              class="field pr-16"
            />
            <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold text-ink-300 hover:text-white"
              @click="showPassword = !showPassword">
              {{ showPassword ? t("auth.hide") : t("auth.show") }}
            </button>
          </div>
        </div>

        <p v-if="error" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error }}</p>

        <button type="submit" :disabled="loading" class="btn-accent h-12 w-full text-base">
          {{ loading ? t("auth.signingIn") : t("auth.signIn") }}
        </button>
      </form>

      <div class="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
        <span class="h-px flex-1 bg-ink-600" /> {{ t("auth.or") }} <span class="h-px flex-1 bg-ink-600" />
      </div>

      <button type="button" :disabled="loading" class="btn-ghost h-11 w-full" @click="useDemo">
        <Icon name="sparkle" :size="16" class="text-accent" /> {{ t("auth.demoAccount") }}
      </button>
      <p class="mt-2 text-center text-xs text-ink-400">
        {{ DEMO_EMAIL }} &middot; {{ DEMO_PASSWORD }}
      </p>

      <p class="mt-6 text-center text-sm text-ink-300">
        {{ t("auth.noAccount") }}
        <RouterLink to="/register" class="font-bold text-white hover:underline">{{ t("auth.registerLink") }}</RouterLink>
      </p>
    </template>
  </AuthShell>
</template>
