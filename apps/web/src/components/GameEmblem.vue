<script setup lang="ts">
import { computed, useId } from "vue";
import type { Emblem, Palette } from "../lib/gameArt";

const props = defineProps<{ emblem: Emblem; palette: Palette }>();

// Gradient/filter ids must be unique per instance: many covers share a page.
const uid = useId();
const fill = computed(() => `url(#${uid}-fill)`);
const deep = computed(() => `url(#${uid}-deep)`);
const red = computed(() => `url(#${uid}-red)`);

const OUTLINE = "rgba(0,0,0,.28)";
const STAR = "50,12 59,38 86,38 64.5,54.5 72.5,81 50,65 27.5,81 35.5,54.5 14,38 41,38";
const SPADE =
  "M50 30C50 30 34 44 34 54C34 61 40 64 46 61C45 66 43 70 40 72H60C57 70 55 66 54 61C60 64 66 61 66 54C66 44 50 30 50 30Z";
</script>

<template>
  <svg viewBox="0 0 100 100" aria-hidden="true" overflow="visible">
    <defs>
      <linearGradient :id="`${uid}-fill`" gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="92">
        <stop offset="0" stop-color="#ffffff" />
        <stop offset="1" :stop-color="palette[0]" />
      </linearGradient>
      <linearGradient :id="`${uid}-deep`" gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="92">
        <stop offset="0" :stop-color="palette[1]" />
        <stop offset="1" :stop-color="palette[2]" />
      </linearGradient>
      <linearGradient :id="`${uid}-red`" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="86">
        <stop offset="0" stop-color="#ff7a8a" />
        <stop offset="1" stop-color="#b3001b" />
      </linearGradient>
      <filter :id="`${uid}-shadow`" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".45" />
      </filter>
    </defs>

    <g :filter="`url(#${uid}-shadow)`">
      <!-- 7 -->
      <template v-if="emblem === 'seven'">
        <text x="53" y="85" text-anchor="middle" font-size="92" font-weight="900" font-style="italic"
          font-family="Figtree, system-ui, sans-serif" :fill="palette[2]" opacity=".7">7</text>
        <text x="50" y="82" text-anchor="middle" font-size="92" font-weight="900" font-style="italic"
          font-family="Figtree, system-ui, sans-serif" :fill="fill" :stroke="OUTLINE" stroke-width="1.5"
          paint-order="stroke">7</text>
      </template>

      <!-- Gem -->
      <template v-else-if="emblem === 'gem'">
        <path d="M16 38 32 17h36l16 21-34 47Z" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M16 38h68L50 85Z" :fill="deep" opacity=".5" />
        <path d="M32 17l9 21 9-21 9 21 9-21" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.3" stroke-linejoin="round" />
        <path d="M41 38l9 47 9-47" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.3" />
        <path d="M34 25l4 6" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      </template>

      <!-- Crown -->
      <template v-else-if="emblem === 'crown'">
        <path d="M16 72 11 30l22 17 17-27 17 27 22-17-5 42Z" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <rect x="15" y="74" width="70" height="11" rx="3" :fill="deep" :stroke="OUTLINE" stroke-width="1" />
        <circle cx="11" cy="28" r="5" :fill="fill" :stroke="OUTLINE" />
        <circle cx="50" cy="17" r="5.5" :fill="fill" :stroke="OUTLINE" />
        <circle cx="89" cy="28" r="5" :fill="fill" :stroke="OUTLINE" />
        <circle cx="50" cy="58" r="6.5" :fill="red" stroke="#fff" stroke-width="1.5" />
        <circle cx="31" cy="62" r="4" :fill="deep" stroke="#fff" stroke-width="1.2" />
        <circle cx="69" cy="62" r="4" :fill="deep" stroke="#fff" stroke-width="1.2" />
      </template>

      <!-- Star -->
      <template v-else-if="emblem === 'star'">
        <polygon :points="STAR" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <polygon :points="STAR" :fill="deep" opacity=".35" transform="translate(50 50) scale(.55) translate(-50 -50)" />
        <path d="M44 26l3-8" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      </template>

      <!-- Lightning bolt -->
      <template v-else-if="emblem === 'bolt'">
        <path d="M58 5 20 57h26l-9 38 45-55H56l12-35Z" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M58 5 44 34h6L64 5Z" fill="#fff" opacity=".55" />
      </template>

      <!-- Pyramid -->
      <template v-else-if="emblem === 'pyramid'">
        <circle cx="72" cy="28" r="13" :fill="fill" opacity=".9" />
        <path d="M50 18 91 83H9Z" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M50 18 91 83H50Z" :fill="deep" opacity=".55" />
        <path d="M31 50h38M20 67h60" stroke="rgba(0,0,0,.18)" stroke-width="1.5" />
      </template>

      <!-- Anchor -->
      <template v-else-if="emblem === 'anchor'">
        <path
          d="M43 16a7 7 0 1 0 14 0a7 7 0 1 0-14 0M50 23v62M36 38h28M20 60c2 18 14 26 30 26s28-8 30-26M13 67l7-9 8 6M87 67l-7-9-8 6"
          fill="none" :stroke="OUTLINE" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M43 16a7 7 0 1 0 14 0a7 7 0 1 0-14 0M50 23v62M36 38h28M20 60c2 18 14 26 30 26s28-8 30-26M13 67l7-9 8 6M87 67l-7-9-8 6"
          fill="none" :stroke="fill" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
      </template>

      <!-- Flame -->
      <template v-else-if="emblem === 'flame'">
        <path d="M50 6c9 20 27 29 27 53 0 17-12 30-27 30S23 76 23 59c0-15 10-21 12-34 6 8 8 15 8 21 5-11 9-24 7-40Z"
          :fill="fill" :stroke="OUTLINE" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M50 48c7 9 13 14 13 23 0 9-6 15-13 15s-13-6-13-15c0-9 8-14 13-23Z" :fill="palette[1]" opacity=".85" />
        <path d="M50 64c3 4 6 6 6 10s-3 7-6 7-6-3-6-7 3-6 6-10Z" fill="#fff" opacity=".9" />
      </template>

      <!-- Snowflake -->
      <template v-else-if="emblem === 'snowflake'">
        <g v-for="angle in [0, 60, 120]" :key="angle" :transform="`rotate(${angle} 50 50)`">
          <path d="M50 10v80M40 18l10 10 10-10M40 82l10-10 10 10M42 34l8 7 8-7M42 66l8-7 8 7" fill="none"
            :stroke="OUTLINE" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <g v-for="angle in [0, 60, 120]" :key="`f${angle}`" :transform="`rotate(${angle} 50 50)`">
          <path d="M50 10v80M40 18l10 10 10-10M40 82l10-10 10 10M42 34l8 7 8-7M42 66l8-7 8 7" fill="none"
            :stroke="fill" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        <circle cx="50" cy="50" r="6" fill="#fff" />
      </template>

      <!-- Roulette wheel -->
      <template v-else-if="emblem === 'roulette'">
        <circle cx="50" cy="50" r="43" :fill="deep" :stroke="fill" stroke-width="4" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#0f172a" stroke-width="12" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#e11d48" stroke-width="12" stroke-dasharray="5.585 5.585" />
        <circle cx="50" cy="50" r="32" fill="none" stroke="#16a34a" stroke-width="12" stroke-dasharray="5.585 195.47" />
        <circle cx="50" cy="50" r="24" :fill="fill" :stroke="OUTLINE" />
        <path d="M50 30v40M30 50h40" :stroke="deep" stroke-width="3" stroke-linecap="round" />
        <circle cx="50" cy="50" r="6" :fill="deep" stroke="#fff" stroke-width="1.5" />
        <circle cx="50" cy="14.5" r="3.5" fill="#fff" />
      </template>

      <!-- Money wheel -->
      <template v-else-if="emblem === 'wheel'">
        <circle cx="50" cy="50" r="44" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#facc15" stroke-width="24" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" stroke-width="24" stroke-dasharray="15.708 15.708" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#8b5cf6" stroke-width="24" stroke-dasharray="15.708 47.124" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="24" stroke-dasharray="0.8 14.908" />
        <circle cx="50" cy="50" r="12" :fill="deep" stroke="#fff" stroke-width="2" />
        <path d="M50 3 43 14h14Z" fill="#fff" :stroke="OUTLINE" />
      </template>

      <!-- Playing cards -->
      <template v-else-if="emblem === 'cards'">
        <rect x="20" y="18" width="42" height="60" rx="6" :fill="deep" :stroke="fill" stroke-width="2.5"
          transform="rotate(-14 50 50)" />
        <g transform="rotate(10 50 50)">
          <rect x="36" y="20" width="42" height="60" rx="6" fill="#fff" :stroke="OUTLINE" stroke-width="1.5" />
          <path :d="SPADE" fill="#0f172a" transform="translate(57 51) scale(.72) translate(-50 -51)" />
          <text x="41" y="33" font-size="11" font-weight="900" font-family="Figtree, system-ui, sans-serif" fill="#0f172a">A</text>
        </g>
      </template>

      <!-- Casino chip -->
      <template v-else-if="emblem === 'chip'">
        <circle cx="50" cy="50" r="41" :fill="deep" :stroke="OUTLINE" stroke-width="1.5" />
        <circle cx="50" cy="50" r="34" fill="none" :stroke="fill" stroke-width="10" stroke-dasharray="11.2 6.6" />
        <circle cx="50" cy="50" r="24" :fill="fill" />
        <circle cx="50" cy="50" r="19" fill="none" :stroke="deep" stroke-width="1.5" stroke-dasharray="3 3" />
        <text x="50" y="59" text-anchor="middle" font-size="24" font-weight="900"
          font-family="Figtree, system-ui, sans-serif" :fill="deep">$</text>
      </template>

      <!-- Blossom -->
      <template v-else-if="emblem === 'blossom'">
        <path v-for="angle in [0, 72, 144, 216, 288]" :key="angle" :transform="`rotate(${angle} 50 50)`"
          d="M50 50C34 40 33 16 45 11l5 6 5-6c12 5 11 29-5 39Z" :fill="fill" :stroke="OUTLINE" stroke-width="1.2" />
        <circle cx="50" cy="50" r="10" :fill="deep" />
        <circle v-for="angle in [0, 72, 144, 216, 288]" :key="`d${angle}`" :transform="`rotate(${angle + 36} 50 50)`"
          cx="50" cy="43" r="2" fill="#ffe08a" />
      </template>

      <!-- Coin stack -->
      <template v-else-if="emblem === 'coin'">
        <ellipse cx="50" cy="80" rx="32" ry="9" :fill="deep" />
        <rect x="18" y="66" width="64" height="14" :fill="deep" />
        <ellipse cx="50" cy="66" rx="32" ry="9" :fill="fill" :stroke="OUTLINE" />
        <circle cx="50" cy="40" r="28" :fill="fill" :stroke="OUTLINE" stroke-width="2" />
        <circle cx="50" cy="40" r="21" fill="none" :stroke="deep" stroke-width="2.5" />
        <text x="50" y="50" text-anchor="middle" font-size="28" font-weight="900"
          font-family="Figtree, system-ui, sans-serif" :fill="deep">$</text>
      </template>

      <!-- Dice -->
      <template v-else-if="emblem === 'dice'">
        <g transform="rotate(-16 35 60)">
          <rect x="12" y="37" width="46" height="46" rx="9" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" />
          <circle cx="24" cy="49" r="4.5" :fill="deep" />
          <circle cx="35" cy="60" r="4.5" :fill="deep" />
          <circle cx="46" cy="71" r="4.5" :fill="deep" />
        </g>
        <g transform="rotate(14 65 40)">
          <rect x="42" y="17" width="46" height="46" rx="9" fill="#fff" :stroke="OUTLINE" stroke-width="1.5" />
          <circle cx="54" cy="29" r="4.5" :fill="red" />
          <circle cx="76" cy="29" r="4.5" :fill="red" />
          <circle cx="65" cy="40" r="4.5" :fill="red" />
          <circle cx="54" cy="51" r="4.5" :fill="red" />
          <circle cx="76" cy="51" r="4.5" :fill="red" />
        </g>
      </template>

      <!-- Gift -->
      <template v-else-if="emblem === 'gift'">
        <rect x="18" y="44" width="64" height="44" rx="4" :fill="deep" :stroke="OUTLINE" stroke-width="1.5" />
        <rect x="12" y="32" width="76" height="16" rx="4" :fill="fill" :stroke="OUTLINE" stroke-width="1.5" />
        <rect x="44" y="32" width="12" height="56" :fill="fill" opacity=".9" />
        <path d="M50 32C40 32 26 28 30 18s18-2 20 14c2-16 16-24 20-14s-10 14-20 14Z" fill="none" :stroke="fill"
          stroke-width="5" stroke-linejoin="round" />
      </template>

      <!-- Cherries -->
      <template v-else>
        <path d="M34 56Q40 32 64 14M68 50Q62 32 64 14" fill="none" stroke="#3f6212" stroke-width="4.5" stroke-linecap="round" />
        <path d="M64 14Q80 4 90 18Q74 28 64 14Z" fill="#65a30d" :stroke="OUTLINE" />
        <circle cx="33" cy="68" r="17" :fill="red" :stroke="OUTLINE" stroke-width="1.5" />
        <circle cx="68" cy="63" r="17" :fill="red" :stroke="OUTLINE" stroke-width="1.5" />
        <circle cx="27" cy="62" r="4.5" fill="#fff" opacity=".7" />
        <circle cx="62" cy="57" r="4.5" fill="#fff" opacity=".7" />
      </template>
    </g>
  </svg>
</template>
