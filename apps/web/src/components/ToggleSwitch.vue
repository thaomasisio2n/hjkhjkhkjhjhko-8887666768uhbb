<script setup lang="ts">
defineProps<{ on: boolean; label: string; disabled?: boolean }>();
defineEmits<{ toggle: [] }>();
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="on"
    :aria-label="label"
    :disabled="disabled"
    class="relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50"
    :class="on ? 'bg-accent' : 'bg-ink-500'"
    @click="$emit('toggle')"
  >
    <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" :class="on ? 'left-6' : 'left-1'" />
  </button>
</template>
