<script setup lang="ts">
import { LOCALES, locale, setLocale, t, type Locale } from "../i18n";
import { useToastStore } from "../stores/toast";

withDefaults(defineProps<{ size?: "sm" | "md" }>(), { size: "md" });

const toast = useToastStore();

function choose(code: Locale) {
  if (code === locale.value) return;
  setLocale(code);
  toast.push(t("toasts.languageChanged"), "info", "check");
}
</script>

<template>
  <div class="inline-flex rounded-full bg-ink-950 p-1" role="radiogroup" :aria-label="t('common.language')">
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      role="radio"
      :aria-checked="locale === l.code"
      :title="l.label"
      class="rounded-full font-bold uppercase transition"
      :class="[
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs',
        locale === l.code ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white',
      ]"
      @click="choose(l.code)"
    >
      {{ l.code }}
    </button>
  </div>
</template>
