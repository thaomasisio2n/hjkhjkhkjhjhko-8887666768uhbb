import { defineStore } from "pinia";
import { api } from "../lib/api";
import { locale } from "../i18n";

export type ChatRoom = "en" | "pl";
export const CHAT_ROOMS: ChatRoom[] = ["en", "pl"];
export const MAX_CHAT_LENGTH = 240;

export interface ChatMessage {
  id: string;
  room: ChatRoom;
  body: string;
  createdAt: string;
  mine: boolean;
  user: { id: string; displayName: string; avatar: string | null } | null;
}

export const useChatStore = defineStore("chat", {
  state: () => ({
    // Start in the room matching the UI language.
    room: (locale.value === "pl" ? "pl" : "en") as ChatRoom,
    messages: { en: [] as ChatMessage[], pl: [] as ChatMessage[] },
    loaded: { en: false, pl: false },
    failed: false,
    sending: false,
  }),
  actions: {
    append(room: ChatRoom, incoming: ChatMessage[]) {
      const seen = new Set(this.messages[room].map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length) this.messages[room] = [...this.messages[room], ...fresh].slice(-200);
    },
    // First call loads the latest page; later calls only fetch what's new.
    async refresh(which?: ChatRoom) {
      const room = which ?? this.room;
      try {
        const last = this.messages[room].at(-1);
        const { data } = await api.get(`/chat/${room}`, { params: last ? { after: last.createdAt } : {} });
        this.append(room, data.messages);
        this.loaded[room] = true;
        this.failed = false;
      } catch {
        this.failed = !this.loaded[room];
      }
    },
    async send(body: string) {
      this.sending = true;
      try {
        const { data } = await api.post(`/chat/${this.room}`, { body });
        this.append(this.room, [data.message]);
      } finally {
        this.sending = false;
      }
    },
  },
});
