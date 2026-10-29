<script setup lang="ts">
withDefaults(defineProps<{ coin: "usd" | "btc" | "eth" | "usdt"; size?: number }>(), { size: 20 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" class="shrink-0">
    <template v-if="coin === 'btc'">
      <circle cx="12" cy="12" r="12" fill="#f7931a" />
      <path
        d="M9 6.5v11M11.5 6.5V5M11.5 19v-1.5M8 7h5a2.5 2.5 0 0 1 0 5H9m0 0h4.5a2.75 2.75 0 0 1 0 5.5H8"
        fill="none"
        stroke="#fff"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>
    <template v-else-if="coin === 'eth'">
      <circle cx="12" cy="12" r="12" fill="#627eea" />
      <path d="M12 3.5 6.8 12.3 12 15.4l5.2-3.1L12 3.5z" fill="#fff" />
      <path d="M6.8 13.4 12 20.5l5.2-7.1L12 16.5l-5.2-3.1z" fill="#fff" fill-opacity=".75" />
    </template>
    <template v-else-if="coin === 'usdt'">
      <circle cx="12" cy="12" r="12" fill="#26a17b" />
      <path d="M7 7.5h10M12 7.5v10" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" />
      <ellipse cx="12" cy="11.2" rx="5.6" ry="1.7" fill="none" stroke="#fff" stroke-width="1.3" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="12" fill="#1fb35b" />
      <path
        d="M15 8.6c-.6-.9-1.7-1.4-3-1.4-1.8 0-3 .9-3 2.2 0 3.1 6.2 1.6 6.2 4.9 0 1.4-1.3 2.4-3.2 2.4-1.4 0-2.6-.6-3.2-1.6M12 5.5v13"
        fill="none"
        stroke="#fff"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </template>
  </svg>
</template>
