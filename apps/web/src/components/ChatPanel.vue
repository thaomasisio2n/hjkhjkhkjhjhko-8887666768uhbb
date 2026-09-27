<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import { CHAT_ROOMS, MAX_CHAT_LENGTH, useChatStore, type ChatRoom } from "../stores/chat";
import { useToastStore } from "../stores/toast";
import { useUiStore } from "../stores/ui";
import { apiErrorMessage } from "../lib/format";
import { intlLocale, t } from "../i18n";
import Icon from "./Icon.vue";
import ModalDialog from "./ModalDialog.vue";
import UserAvatar from "./UserAvatar.vue";

const POLL_MS = 3_000;

const auth = useAuthStore();
const chat = useChatStore();
const ui = useUiStore();
const toast = useToastStore();

const draft = ref("");
const list = ref<HTMLElement | null>(null);
const showRules = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const messages = computed(() => chat.messages[chat.room]);
const remaining = computed(() => MAX_CHAT_LENGTH - draft.value.length);

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(intlLocale(), { hour: "2-digit", minute: "2-digit" });

function nearBottom() {
  const el = list.value;
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

async function scrollToBottom() {
  await nextTick();
  list.value?.scrollTo({ top: list.value.scrollHeight });
}

// Keep the view pinned to new messages unless the reader scrolled up.
watch(
  () => messages.value.length,
  async (_length, previous) => {
    if (!previous || nearBottom() || messages.value.at(-1)?.mine) await scrollToBottom();
  }
);

async function switchRoom(room: ChatRoom) {
  chat.room = room;
  await chat.refresh(room);
  scrollToBottom();
}

async function send() {
  const body = draft.value.trim();
  if (!body || remaining.value < 0 || chat.sending) return;
  try {
    await chat.send(body);
    draft.value = "";
  } catch (e) {
    toast.push(apiErrorMessage(e, t("chat.loadFailed")), "error");
  }
}

function poll() {
  if (document.visibilityState === "visible") chat.refresh();
}

onMounted(async () => {
  await chat.refresh();
  scrollToBottom();
  timer = setInterval(poll, POLL_MS);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <aside
    class="fixed inset-0 z-50 flex animate-fade-in flex-col bg-ink-900 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-[340px] lg:shrink-0 lg:border-l lg:border-ink-700"
    :aria-label="t('chat.title')"
  >
    <header class="flex h-[60px] shrink-0 items-center gap-2 px-3 shadow-bar">
      <Icon name="chat" :size="18" class="ml-1 text-ink-300" />
      <h2 class="font-bold">{{ t("chat.title") }}</h2>
      <div class="ml-auto inline-flex rounded-full bg-ink-950 p-1" role="radiogroup" :aria-label="t('chat.title')">
        <button
          v-for="room in CHAT_ROOMS"
          :key="room"
          type="button"
          role="radio"
          :aria-checked="chat.room === room"
          :title="t(`chat.rooms.${room}`)"
          class="rounded-full px-3 py-1 text-[11px] font-bold uppercase transition"
          :class="chat.room === room ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'"
          @click="switchRoom(room)"
        >
          {{ room }}
        </button>
      </div>
      <button type="button" class="flex h-9 w-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-white"
        :aria-label="t('chat.rules')" :title="t('chat.rules')" @click="showRules = true">
        <Icon name="info" :size="18" />
      </button>
      <button type="button" class="flex h-9 w-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-700 hover:text-white"
        :aria-label="t('chat.close')" @click="ui.toggleChat(false)">
        <Icon name="x" :size="18" />
      </button>
    </header>

    <p v-if="auth.user?.ghostMode" class="flex items-center gap-2 bg-ink-800 px-4 py-2 text-xs text-ink-300">
      <Icon name="eye-off" :size="14" /> {{ t("chat.ghostNotice") }}
    </p>

    <div ref="list" class="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-live="polite" data-testid="chat-messages">
      <p v-if="chat.failed" class="py-10 text-center text-sm text-ink-300">{{ t("chat.loadFailed") }}</p>
      <p v-else-if="chat.loaded[chat.room] && !messages.length" class="py-10 text-center text-sm text-ink-300">{{ t("chat.empty") }}</p>
      <div v-for="m in messages" :key="m.id" class="flex gap-2.5 rounded-md px-2 py-1.5 hover:bg-ink-800" data-testid="chat-message">
        <UserAvatar v-if="m.user" :name="m.user.displayName" :avatar="m.user.avatar" :size="28" class="mt-0.5" />
        <span v-else class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-700 text-ink-400">
          <Icon name="eye-off" :size="14" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="flex items-baseline gap-2 text-xs">
            <span class="truncate font-bold" :class="m.mine ? 'text-accent' : m.user ? 'text-white' : 'italic text-ink-400'">
              {{ m.user?.displayName ?? t("chat.hidden") }}<template v-if="m.mine"> ({{ t("chat.you") }})</template>
            </span>
            <span class="shrink-0 text-[10px] text-ink-400">{{ timeOf(m.createdAt) }}</span>
          </p>
          <p class="break-words text-sm leading-snug text-ink-300">{{ m.body }}</p>
        </div>
      </div>
    </div>

    <form class="shrink-0 border-t border-ink-700 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" @submit.prevent="send">
      <div class="flex gap-2">
        <input
          v-model="draft"
          type="text"
          :maxlength="MAX_CHAT_LENGTH + 20"
          :placeholder="t('chat.placeholder')"
          :aria-label="t('chat.placeholder')"
          class="field flex-1 py-2"
        />
        <button type="submit" class="btn-accent h-10 w-10 shrink-0 px-0" :disabled="chat.sending || !draft.trim() || remaining < 0" :aria-label="t('chat.send')">
          <Icon name="send" :size="16" />
        </button>
      </div>
      <div class="mt-1.5 flex items-center justify-between text-[11px]">
        <button type="button" class="font-semibold text-ink-400 hover:text-white" @click="showRules = true">{{ t("chat.rules") }}</button>
        <span :class="remaining < 0 ? 'font-bold text-red-400' : remaining < 30 ? 'text-amber-300' : 'text-ink-400'">{{ remaining }}</span>
      </div>
    </form>

    <ModalDialog v-if="showRules" icon="chat" :title="t('chat.rules')" @close="showRules = false">
      <p>{{ t("chat.rulesIntro") }}</p>
      <ul class="mt-3 space-y-1.5">
        <li v-for="n in 7" :key="n" class="flex gap-2">
          <Icon name="check" :size="14" class="mt-0.5 text-accent" /> {{ t(`chat.rule${n}`) }}
        </li>
      </ul>
      <template #actions>
        <button type="button" class="btn-accent w-full" @click="showRules = false">OK</button>
      </template>
    </ModalDialog>
  </aside>
</template>
