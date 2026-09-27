<script setup lang="ts">
import { RouterLink } from "vue-router";
import { t } from "../i18n";

withDefaults(defineProps<{ size?: "sm" | "md" | "lg" }>(), { size: "md" });
</script>

<template>
  <RouterLink
    to="/lobby"
    class="group inline-flex select-none items-center gap-1.5 font-black italic tracking-tight text-white"
    :class="{ 'text-lg': size === 'sm', 'text-[22px]': size === 'md', 'text-3xl': size === 'lg' }"
    :aria-label="t('brand.home')"
  >
    <svg
      viewBox="0 0 24 24"
      class="shrink-0 text-accent transition-transform duration-300 group-hover:rotate-90"
      :class="{ 'h-4 w-4': size === 'sm', 'h-5 w-5': size === 'md', 'h-7 w-7': size === 'lg' }"
      aria-hidden="true"
    >
      <path fill="currentColor" d="M12 2c.9 6.3 3.7 9.1 10 10-6.3.9-9.1 3.7-10 10-.9-6.3-3.7-9.1-10-10 6.3-.9 9.1-3.7 10-10z" />
    </svg>
    <span class="pr-0.5">novaspin</span>
  </RouterLink>
</template>
