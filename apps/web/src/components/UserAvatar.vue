<script setup lang="ts">
import { computed } from "vue";
import { avatarPreset } from "../lib/avatars";
import { initials } from "../lib/format";
import GameEmblem from "./GameEmblem.vue";

const props = withDefaults(defineProps<{ name?: string | null; avatar?: string | null; size?: number }>(), {
  name: null,
  avatar: null,
  size: 32,
});

const preset = computed(() => avatarPreset(props.avatar));
const background = computed(() => {
  const p = preset.value?.palette;
  return p ? `radial-gradient(120% 120% at 30% 20%, ${p[1]} 0%, ${p[2]} 80%)` : undefined;
});
</script>

<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
    :class="preset ? 'ring-1 ring-white/10' : 'bg-gradient-to-br from-accent to-emerald-600 font-extrabold text-accent-ink'"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px`, background }"
    aria-hidden="true"
  >
    <GameEmblem v-if="preset" class="h-[68%] w-[68%]" :emblem="preset.emblem" :palette="preset.palette" />
    <template v-else>{{ initials(name) }}</template>
  </span>
</template>
