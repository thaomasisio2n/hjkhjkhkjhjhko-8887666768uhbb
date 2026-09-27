<script setup lang="ts">
import { computed } from "vue";
import { ICONS, type IconName } from "../lib/icons";

const props = withDefaults(
  defineProps<{ name: IconName; size?: number | string; stroke?: number; filled?: boolean }>(),
  { size: 18, stroke: 2, filled: false }
);

const paths = computed(() => ICONS[props.name]);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>
