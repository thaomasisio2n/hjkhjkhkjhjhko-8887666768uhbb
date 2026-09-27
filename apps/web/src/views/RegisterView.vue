<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";
import AuthShell from "../components/AuthShell.vue";
import Icon from "../components/Icon.vue";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const displayName = ref("");
const referralCode = ref("");
const showReferral = ref(false);
const error = ref("");
const loading = ref(false);

onMounted(() => {
  const ref_ = route.query.ref;
  if (typeof ref_ === "string") {
    referralCode.value = ref_;
    showReferral.value = true;
  }
});

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.register({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
      referralCode: referralCode.value || undefined,
    });
    router.push({ name: "lobby" });
  } catch (e: any) {
    const err = e?.response?.data?.error;
    error.value = typeof err === "string" ? err : "Registration failed — check the fields and try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Create an account" subtitle="Demo account with a simulated welcome balance.">
    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label for="reg-name" class="field-label">Username</label>
        <input id="reg-name" v-model="displayName" type="text" autocomplete="nickname" required class="field" />
      </div>
      <div>
        <label for="reg-email" class="field-label">Email</label>
        <input id="reg-email" v-model="email" type="email" autocomplete="email" required class="field" />
      </div>
      <div>
        <label for="reg-password" class="field-label">Password</label>
        <input id="reg-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required class="field" />
        <p class="mt-1.5 text-xs text-ink-400">At least 8 characters.</p>
      </div>

      <div>
        <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-ink-300 hover:text-white" @click="showReferral = !showReferral">
          Referral code (optional)
          <Icon name="chevron-down" :size="14" class="transition" :class="{ 'rotate-180': showReferral }" />
        </button>
        <input
          v-if="showReferral"
          v-model="referralCode"
          type="text"
          aria-label="Referral code"
          placeholder="e.g. DEMO0001"
          class="field mt-2 font-mono uppercase tracking-wider"
        />
      </div>

      <p v-if="error" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn-accent h-12 w-full text-base">
        {{ loading ? "Creating account…" : "Create account" }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm text-ink-300">
      Already have an account?
      <RouterLink to="/login" class="font-bold text-white hover:underline">Sign in</RouterLink>
    </p>
  </AuthShell>
</template>
