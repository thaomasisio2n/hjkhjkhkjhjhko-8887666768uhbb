<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ cents: number }>();

const formatted = computed(() =>
  (props.cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
);
</script>

<template>
  <div class="flex items-center gap-2 bg-surface-800 border border-surface-700 rounded-full px-3 py-1.5">
    <span class="text-gold text-sm">&#9679;</span>
    <span class="font-semibold text-sm">{{ formatted }}</span>
    <span class="text-[10px] uppercase tracking-wide text-slate-400">demo</span>
  </div>
</template>
