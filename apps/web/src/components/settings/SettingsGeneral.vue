<script setup lang="ts">
import { USERNAME_LENGTH } from "@novaspin/shared";
import { computed, ref, watch } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useUiStore } from "../../stores/ui";
import { useWalletStore } from "../../stores/wallet";
import { api } from "../../lib/api";
import { AVATARS } from "../../lib/avatars";
import { apiErrorMessage } from "../../lib/format";
import type { IconName } from "../../lib/icons";
import { intlLocale, t } from "../../i18n";
import Icon from "../Icon.vue";
import LanguageSwitch from "../LanguageSwitch.vue";
import SharedLock from "./SharedLock.vue";
import ToggleSwitch from "../ToggleSwitch.vue";
import UserAvatar from "../UserAvatar.vue";

const auth = useAuthStore();
const ui = useUiStore();
const wallet = useWalletStore();
const toast = useToastStore();

const memberSince = computed(() =>
  auth.user?.createdAt
    ? // A full date keeps Polish in the genitive ("27 września 2026", not "wrzesień").
      new Date(auth.user.createdAt).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" })
    : "—"
);

const stats = computed<{ label: string; value: string; icon: IconName; wide?: boolean }[]>(() => [
  { label: t("settings.statBalance"), value: ui.money(wallet.balanceCents), icon: "wallet", wide: true },
  { label: t("settings.statFavourites"), value: String(ui.favourites.length), icon: "heart" },
  { label: t("settings.statPlayed"), value: String(ui.recent.length), icon: "history" },
]);

const preferences = computed(() => [
  { id: "streamer", title: t("settings.streamerTitle"), text: t("settings.streamerText"), on: ui.streamerMode, toggle: () => ui.toggleStreamerMode() },
  { id: "compact", title: t("settings.compactTitle"), text: t("settings.compactText"), on: ui.sidebarCollapsed, toggle: () => ui.toggleSidebar(), desktopOnly: true },
]);

const displayName = ref(auth.user?.displayName ?? "");
const savingProfile = ref(false);
const profileError = ref("");
watch(
  () => auth.user?.displayName,
  (name) => {
    if (name && !savingProfile.value) displayName.value = name;
  }
);
const profileDirty = computed(() => displayName.value.trim() !== (auth.user?.displayName ?? ""));

async function saveProfile() {
  profileError.value = "";
  savingProfile.value = true;
  try {
    const { data } = await api.patch("/auth/me", { displayName: displayName.value.trim() });
    auth.user = data;
    displayName.value = data.displayName;
    toast.push(t("toasts.profileUpdated"), "success", "user");
  } catch (e) {
    profileError.value = apiErrorMessage(e, t("settings.profileFailed"));
  } finally {
    savingProfile.value = false;
  }
}

// Avatar: saved as soon as it's picked.
const savingAvatar = ref(false);
async function saveAvatar(avatar: string | null) {
  if (savingAvatar.value || (auth.user?.avatar ?? null) === avatar) return;
  savingAvatar.value = true;
  try {
    const { data } = await api.patch("/auth/me", { avatar });
    auth.user = data;
    toast.push(t("toasts.avatarUpdated"), "success", "user");
  } catch (e) {
    toast.push(apiErrorMessage(e, t("settings.profileFailed")), "error");
  } finally {
    savingAvatar.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Wraps the stats onto their own row when the column is narrow (e.g. chat open). -->
    <section class="panel flex flex-wrap items-center gap-5 p-5 sm:p-6">
      <UserAvatar :name="auth.user?.displayName" :avatar="auth.user?.avatar" :size="64" />
      <div class="min-w-[12rem] flex-1">
        <p class="truncate text-lg font-extrabold">{{ auth.user?.displayName ?? t("topbar.player") }}</p>
        <p class="truncate text-sm text-ink-300">{{ auth.user?.email }}</p>
        <p class="mt-1 text-xs text-ink-400">{{ t("settings.memberSince", { date: memberSince }) }}</p>
      </div>
      <div class="grid w-full grid-cols-2 gap-2 sm:w-[420px] sm:grid-cols-3">
        <div v-for="s in stats" :key="s.label" class="rounded-lg bg-ink-800 px-3 py-3" :class="{ 'col-span-2 sm:col-span-1': s.wide }">
          <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            <Icon :name="s.icon" :size="12" /> <span class="truncate">{{ s.label }}</span>
          </p>
          <p class="mt-1 truncate font-extrabold tabular-nums">{{ s.value }}</p>
        </div>
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-2">
      <section>
        <h2 class="mb-3 text-lg font-bold">{{ t("settings.preferences") }}</h2>
        <div class="panel divide-y divide-ink-600">
          <div v-for="p in preferences" :key="p.id" class="items-center gap-4 p-5" :class="p.desktopOnly ? 'hidden lg:flex' : 'flex'">
            <div class="flex-1">
              <p class="font-bold">{{ p.title }}</p>
              <p class="mt-0.5 text-sm text-ink-300">{{ p.text }}</p>
            </div>
            <ToggleSwitch :on="p.on" :label="p.title" @toggle="p.toggle" />
          </div>
          <div class="flex items-center gap-4 p-5">
            <div class="flex-1">
              <p class="font-bold">{{ t("settings.languageTitle") }}</p>
              <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.languageText") }}</p>
            </div>
            <LanguageSwitch />
          </div>
        </div>
      </section>

      <section>
        <h2 class="mb-3 text-lg font-bold">{{ t("settings.profile") }}</h2>
        <SharedLock>
          <form class="panel space-y-4 p-5" @submit.prevent="saveProfile">
            <div>
              <span class="field-label">{{ t("settings.avatar") }}</span>
              <div class="grid grid-cols-7 gap-2" role="radiogroup" :aria-label="t('settings.avatar')">
                <button
                  type="button"
                  role="radio"
                  :aria-checked="!auth.user?.avatar"
                  :aria-label="t('settings.avatarInitials')"
                  :title="t('settings.avatarInitials')"
                  class="flex aspect-square items-center justify-center rounded-full transition hover:scale-105"
                  :class="!auth.user?.avatar ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink-700' : 'opacity-70 hover:opacity-100'"
                  :disabled="savingAvatar"
                  @click="saveAvatar(null)"
                >
                  <UserAvatar :name="auth.user?.displayName" :size="40" />
                </button>
                <button
                  v-for="a in AVATARS"
                  :key="a.key"
                  type="button"
                  role="radio"
                  :aria-checked="auth.user?.avatar === a.key"
                  :aria-label="a.key"
                  class="flex aspect-square items-center justify-center rounded-full transition hover:scale-105"
                  :class="auth.user?.avatar === a.key ? 'ring-2 ring-accent ring-offset-2 ring-offset-ink-700' : 'opacity-70 hover:opacity-100'"
                  :disabled="savingAvatar"
                  @click="saveAvatar(a.key)"
                >
                  <UserAvatar :avatar="a.key" :size="40" />
                </button>
              </div>
              <p class="mt-1.5 text-xs text-ink-400">{{ t("settings.avatarHint") }}</p>
            </div>
            <div>
              <label for="set-name" class="field-label">{{ t("auth.username") }}</label>
              <input id="set-name" v-model="displayName" type="text" :minlength="USERNAME_LENGTH.min" :maxlength="USERNAME_LENGTH.max" required autocomplete="nickname" class="field" />
              <p class="mt-1.5 text-xs text-ink-400">{{ t("settings.usernameHint") }}</p>
            </div>
            <div>
              <label for="set-email" class="field-label">{{ t("auth.email") }}</label>
              <input id="set-email" :value="auth.user?.email ?? ''" readonly class="field cursor-not-allowed text-ink-400" />
            </div>
            <p v-if="profileError" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ profileError }}</p>
            <button type="submit" class="btn-blue" :disabled="!profileDirty || savingProfile || displayName.trim().length < 2">
              {{ savingProfile ? t("settings.saving") : t("settings.saveChanges") }}
            </button>
          </form>
        </SharedLock>
      </section>
    </div>
  </div>
</template>
