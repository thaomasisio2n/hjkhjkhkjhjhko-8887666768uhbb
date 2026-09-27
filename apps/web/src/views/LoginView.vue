<script setup lang="ts">
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { apiErrorMessage } from "../lib/format";
import { t } from "../i18n";
import AuthShell from "../components/AuthShell.vue";
import Icon from "../components/Icon.vue";

const DEMO_EMAIL = "demo@novaspin.test";
const DEMO_PASSWORD = "demo1234";

const auth = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    router.push({ name: "lobby" });
  } catch (e) {
    error.value = apiErrorMessage(e, t("auth.loginFailed"));
  } finally {
    loading.value = false;
  }
}

function useDemo() {
  email.value = DEMO_EMAIL;
  password.value = DEMO_PASSWORD;
  submit();
}
</script>

<template>
  <AuthShell :title="t('auth.signInTitle')" :subtitle="t('auth.signInSubtitle')">
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
  </AuthShell>
</template>
