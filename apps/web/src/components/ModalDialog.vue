<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { t } from "../i18n";
import Icon from "./Icon.vue";
import type { IconName } from "../lib/icons";

withDefaults(defineProps<{ title: string; icon?: IconName; tone?: "danger" | "info" }>(), { icon: "info", tone: "info" });
const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <!-- Teleported so parent layout (spacing utilities, overflow, stacking) can't shift or clip it. -->
  <Teleport to="body">
    <div class="fixed inset-0 z-[55] flex animate-fade-in items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" @click.self="emit('close')">
      <div role="dialog" aria-modal="true" :aria-label="title" class="w-full max-w-md animate-pop-in rounded-xl bg-ink-800 p-6 shadow-lift">
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="tone === 'danger' ? 'bg-red-500/15 text-red-400' : 'bg-blue/15 text-blue-hover'">
            <Icon :name="icon" :size="20" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-extrabold">{{ title }}</h2>
            <div class="mt-1 text-sm text-ink-300"><slot /></div>
          </div>
          <button type="button" class="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-white"
            :aria-label="t('common.close')" @click="emit('close')">
            <Icon name="x" :size="18" />
          </button>
        </div>
        <div class="mt-6"><slot name="actions" /></div>
      </div>
    </div>
  </Teleport>
</template>
