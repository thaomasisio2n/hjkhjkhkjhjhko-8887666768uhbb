<script setup lang="ts">
import { t } from "../../i18n";
import Icon from "../Icon.vue";
</script>

<template>
  <div class="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-[11px] font-semibold leading-tight text-ink-950 sm:text-xs">
    <Icon name="shield" :size="14" class="hidden sm:block" />
    <span>{{ t("banner") }}</span>
  </div>
</template>
