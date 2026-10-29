<script setup lang="ts">
import { useToastStore } from "../stores/toast";
import Icon from "./Icon.vue";
import { t } from "../i18n";

const toasts = useToastStore();

const TONE = {
  success: "bg-accent/15 text-accent",
  info: "bg-blue/15 text-blue-hover",
  error: "bg-red-500/15 text-red-400",
} as const;
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-4 bottom-20 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[72px] sm:items-end lg:bottom-auto"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts.items"
        :key="toast.id"
        class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border border-white/5 bg-ink-700 py-2.5 pl-3 pr-2 text-sm font-semibold shadow-lift sm:w-80"
        role="status"
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" :class="TONE[toast.tone]">
          <Icon :name="toast.icon" :size="15" :stroke="2.5" />
        </span>
        <span class="flex-1">{{ toast.message }}</span>
        <button type="button" class="flex h-7 w-7 items-center justify-center rounded-md text-ink-300 hover:bg-ink-600 hover:text-white"
          :aria-label="t('common.dismiss')" @click="toasts.dismiss(toast.id)">
          <Icon name="x" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 220ms ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
