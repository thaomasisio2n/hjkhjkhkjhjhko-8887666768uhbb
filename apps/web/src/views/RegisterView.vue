<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref("");
const password = ref("");
const displayName = ref("");
const referralCode = ref("");
const error = ref("");
const loading = ref(false);

onMounted(() => {
  const ref_ = route.query.ref;
  if (typeof ref_ === "string") referralCode.value = ref_;
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
    error.value = e?.response?.data?.error ?? "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-2rem)] flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm bg-surface-900 border border-surface-700 rounded-2xl p-8">
      <div class="text-center mb-6">
        <div class="text-2xl font-bold"><span class="text-brand-400">Nova</span><span class="text-gold">Spin</span></div>
        <p class="text-slate-400 text-sm mt-1">Create a demo account. Fake balance included &#128075;</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-xs text-slate-400">Display name</label>
          <input
            v-model="displayName"
            type="text"
            required
            class="mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400">Password</label>
          <input
            v-model="password"
            type="password"
            minlength="8"
            required
            class="mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400">Referral code (optional)</label>
          <input
            v-model="referralCode"
            type="text"
            class="mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400 uppercase"
          />
        </div>

        <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand-500 hover:bg-brand-400 transition text-white font-semibold text-sm rounded-lg py-2.5 disabled:opacity-50"
        >
          {{ loading ? "Creating account..." : "Create account" }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-400 mt-6">
        Already have an account?
        <RouterLink to="/login" class="text-brand-400 hover:text-brand-300">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>
