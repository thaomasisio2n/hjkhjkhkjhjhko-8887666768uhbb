<script setup lang="ts">
import { computed } from "vue";
import { artFor } from "../lib/gameArt";
import GameEmblem from "./GameEmblem.vue";

const props = withDefaults(
  defineProps<{ title: string; category: string; provider?: string; showTitle?: boolean }>(),
  { provider: "", showTitle: true }
);

const art = computed(() => artFor(props.title, props.category));

// Long titles step down a size so they stay legible on a tile.
const titleSize = computed(() => {
  const longestWord = Math.max(...props.title.split(/\s+/).map((w) => w.length));
  if (props.title.length > 22) return "text-[8.5cqw]";
  if (props.title.length > 18 || longestWord > 9) return "text-[9.5cqw]";
  if (props.title.length > 12) return "text-[11cqw]";
  return "text-[12.5cqw]";
});

const background = computed(() => {
  const [light, mid, deep] = art.value.palette;
  return [
    `radial-gradient(90% 60% at 50% 32%, ${light}66 0%, transparent 60%)`,
    `radial-gradient(140% 100% at 50% 20%, ${mid} 0%, ${deep} 78%)`,
  ].join(", ");
});

// Sunburst rays behind the emblem (shared shape, computed once per cover).
const rays = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const w = Math.PI / 28;
  const p = (t: number) => `${(Math.cos(t) * 90).toFixed(1)},${(Math.sin(t) * 90).toFixed(1)}`;
  return `0,0 ${p(a - w)} ${p(a + w)}`;
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden [container-type:inline-size]" :style="{ background }">
    <svg class="absolute inset-0 h-full w-full opacity-[0.14]" viewBox="-50 -62 100 133" preserveAspectRatio="xMidYMid slice"
      aria-hidden="true">
      <polygon v-for="(pts, i) in rays" :key="i" :points="pts" fill="#fff" />
    </svg>
    <div
      class="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]"
    />

    <div class="absolute left-1/2 top-[40%] aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2">
      <div class="absolute inset-[12%] rounded-full bg-white/25 blur-2xl" />
      <GameEmblem class="relative h-full w-full" :emblem="art.emblem" :palette="art.palette" />
    </div>

    <div
      v-if="showTitle"
      class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-[7cqw] pb-[7cqw] pt-[22cqw] text-center"
    >
      <p
        class="line-clamp-3 font-black uppercase italic leading-[0.95] tracking-tight [word-spacing:0.06em] text-white [text-shadow:0_2px_0_rgba(0,0,0,.35),0_4px_14px_rgba(0,0,0,.5)]"
        :class="titleSize"
      >
        {{ title }}
      </p>
      <p v-if="provider" class="mt-[2.5cqw] truncate text-[5.5cqw] font-bold uppercase tracking-[0.18em] text-white/70">
        {{ provider }}
      </p>
    </div>
  </div>
</template>
