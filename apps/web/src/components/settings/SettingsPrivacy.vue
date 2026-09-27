<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { useToastStore } from "../../stores/toast";
import { useUiStore } from "../../stores/ui";
import { api } from "../../lib/api";
import { apiErrorMessage } from "../../lib/format";
import { t } from "../../i18n";
import Icon from "../Icon.vue";
import ModalDialog from "../ModalDialog.vue";
import ToggleSwitch from "../ToggleSwitch.vue";

const auth = useAuthStore();
const ui = useUiStore();
const toast = useToastStore();
const router = useRouter();

const savingGhost = ref(false);
async function toggleGhost() {
  savingGhost.value = true;
  try {
    const { data } = await api.patch("/auth/me", { ghostMode: !auth.user?.ghostMode });
    auth.user = data;
    toast.push(t(data.ghostMode ? "toasts.ghostOn" : "toasts.ghostOff"), "info", data.ghostMode ? "eye-off" : "eye");
  } catch (e) {
    toast.push(apiErrorMessage(e, t("settings.profileFailed")), "error");
  } finally {
    savingGhost.value = false;
  }
}

function clearRecent() {
  ui.clearRecent();
  toast.push(t("toasts.recentCleared"), "success", "history");
}

function clearFavourites() {
  ui.clearFavourites();
  toast.push(t("toasts.favouritesCleared"), "success", "heart");
}

function logout() {
  auth.logout();
  router.push({ name: "login" });
}

const deleting = ref(false);
const deletePassword = ref("");
const deleteError = ref("");
const deleteBusy = ref(false);

async function deleteAccount() {
  deleteError.value = "";
  deleteBusy.value = true;
  try {
    await api.delete("/auth/me", { data: { password: deletePassword.value } });
    auth.logout({ remote: false });
    toast.push(t("toasts.accountDeleted"), "info", "trash");
    router.push({ name: "login" });
  } catch (e) {
    deleteError.value = apiErrorMessage(e, t("settings.profileFailed"));
  } finally {
    deleteBusy.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="panel divide-y divide-ink-600">
      <div class="flex items-center gap-4 p-5">
        <div class="flex-1">
          <p class="font-bold">{{ t("settings.ghostTitle") }}</p>
          <p class="mt-0.5 text-sm text-ink-300">{{ t("settings.ghostText") }}</p>
        </div>
        <ToggleSwitch :on="!!auth.user?.ghostMode" :label="t('settings.ghostTitle')" :disabled="savingGhost" @toggle="toggleGhost" />
      </div>
    </section>

    <section>
      <h2 class="mb-3 text-lg font-bold">{{ t("settings.browserData") }}</h2>
      <div class="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <p class="flex-1 text-sm text-ink-300">{{ t("settings.browserDataText") }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-ghost" :disabled="!ui.recent.length" @click="clearRecent">
            <Icon name="history" :size="16" /> {{ t("settings.clearRecent") }}
          </button>
          <button type="button" class="btn-ghost" :disabled="!ui.favourites.length" @click="clearFavourites">
            <Icon name="trash" :size="16" /> {{ t("settings.clearFavourites") }}
          </button>
          <button type="button" class="btn-ghost" @click="logout">
            <Icon name="logout" :size="16" /> {{ t("settings.logout") }}
          </button>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-red-500/25 bg-red-500/5 p-5">
      <p class="font-bold text-red-300">{{ t("settings.deleteTitle") }}</p>
      <p class="mt-0.5 max-w-2xl text-sm text-ink-300">{{ t("settings.deleteText") }}</p>
      <button type="button" class="btn mt-4 bg-red-500/15 text-red-300 hover:bg-red-500/25" @click="deleting = true">
        <Icon name="trash" :size="16" /> {{ t("settings.deleteCta") }}
      </button>
    </section>

    <ModalDialog v-if="deleting" tone="danger" icon="trash" :title="t('settings.deleteConfirmTitle')" @close="deleting = false">
      {{ t("settings.deleteConfirmText") }}
      <template #actions>
        <form class="space-y-3" @submit.prevent="deleteAccount">
          <input v-model="deletePassword" type="password" autocomplete="current-password" required :aria-label="t('auth.password')"
            :placeholder="t('auth.password')" class="field" />
          <p v-if="deleteError" class="rounded-md bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">{{ deleteError }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn-ghost" @click="deleting = false">{{ t("common.cancel") }}</button>
            <button type="submit" class="btn bg-red-500 text-white hover:bg-red-400" :disabled="deleteBusy || !deletePassword">
              {{ t("settings.deleteConfirm") }}
            </button>
          </div>
        </form>
      </template>
    </ModalDialog>
  </div>
</template>
