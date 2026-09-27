<script setup lang="ts">
import { ref, onMounted } from "vue";
import { api } from "../lib/api";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  invited: { id: string; displayName: string; createdAt: string }[];
  totalEarnedCents: number;
}

const data = ref<ReferralData | null>(null);
const copied = ref(false);

onMounted(async () => {
  const { data: res } = await api.get("/referrals");
  data.value = res;
});

async function copyLink() {
  if (!data.value) return;
  try {
    await navigator.clipboard.writeText(data.value.referralLink);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard access denied — non-critical for a demo
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-2">Referrals</h1>
    <p class="text-slate-400 text-sm mb-6">
      Invite friends, they get a demo welcome bonus, you get a demo referral bonus.
      No real money changes hands.
    </p>

    <div v-if="data" class="space-y-8">
      <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6">
        <p class="text-xs text-slate-400 uppercase tracking-wide mb-2">Your referral link</p>
        <div class="flex items-center gap-2">
          <input
            readonly
            :value="data.referralLink"
            class="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-slate-300"
          />
          <button
            class="bg-brand-500 hover:bg-brand-400 transition text-white text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap"
            @click="copyLink"
          >
            {{ copied ? "Copied!" : "Copy" }}
          </button>
        </div>
        <p class="text-xs text-slate-500 mt-2">Code: <span class="font-mono text-slate-300">{{ data.referralCode }}</span></p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6">
          <p class="text-xs text-slate-400 uppercase tracking-wide">Friends invited</p>
          <p class="text-3xl font-bold mt-2">{{ data.invited.length }}</p>
        </div>
        <div class="bg-surface-900 border border-surface-700 rounded-2xl p-6">
          <p class="text-xs text-slate-400 uppercase tracking-wide">Bonus earned (demo)</p>
          <p class="text-3xl font-bold mt-2 text-gold">
            {{ (data.totalEarnedCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }) }}
          </p>
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold mb-3">Invited friends</h2>
        <div class="bg-surface-900 border border-surface-700 rounded-xl divide-y divide-surface-800">
          <div v-if="data.invited.length === 0" class="p-4 text-sm text-slate-400">
            No one yet &mdash; share your link above.
          </div>
          <div
            v-for="friend in data.invited"
            :key="friend.id"
            class="p-4 flex items-center justify-between text-sm"
          >
            <span>{{ friend.displayName }}</span>
            <span class="text-xs text-slate-400">{{ new Date(friend.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
