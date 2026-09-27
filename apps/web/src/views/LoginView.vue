<script setup lang="ts">
import { ref } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    router.push({ name: "lobby" });
  } catch (e: any) {
    error.value = e?.response?.data?.error ?? "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-2rem)] flex items-center justify-center px-4">
    <div class="w-full max-w-sm bg-surface-900 border border-surface-700 rounded-2xl p-8">
      <div class="text-center mb-6">
        <div class="text-2xl font-bold"><span class="text-brand-400">Nova</span><span class="text-gold">Spin</span></div>
        <p class="text-slate-400 text-sm mt-1">Demo login — no real money involved.</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
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
            required
            class="mt-1 w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <p v-if="error" class="text-red-400 text-xs">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-brand-500 hover:bg-brand-400 transition text-white font-semibold text-sm rounded-lg py-2.5 disabled:opacity-50"
        >
          {{ loading ? "Signing in..." : "Sign in" }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-400 mt-6">
        No account?
        <RouterLink to="/register" class="text-brand-400 hover:text-brand-300">Register</RouterLink>
      </p>
    </div>
  </div>
</template>
