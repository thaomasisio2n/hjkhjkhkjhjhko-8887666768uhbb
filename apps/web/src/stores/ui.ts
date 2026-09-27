import { defineStore } from "pinia";
import { formatMoney } from "../lib/money";
import { t } from "../i18n";
import { useToastStore } from "./toast";

// Per-browser UI conveniences. Storage can be unavailable (private mode,
// blocked site data) or hold anything at all, so every value is parsed,
// checked against its expected shape, and falls back when it doesn't fit.
type Guard<T> = (value: unknown) => value is T;
const isBoolean: Guard<boolean> = (v): v is boolean => typeof v === "boolean";
const isCount: Guard<number> = (v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isSlugList: Guard<string[]> = (v): v is string[] =>
  Array.isArray(v) && v.length <= 200 && v.every((s) => typeof s === "string" && s.length <= 100);

function load<T>(key: string, fallback: T, valid: Guard<T>): T {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : undefined;
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // non-critical
  }
}

export const useUiStore = defineStore("ui", {
  state: () => ({
    sidebarCollapsed: load("ns_sidebar_collapsed", false, isBoolean),
    streamerMode: load("ns_streamer_mode", false, isBoolean),
    mobileNavOpen: false,
    walletOpen: false,
    searchOpen: false,
    favourites: load("ns_favourites", [], isSlugList),
    recent: load("ns_recent", [], isSlugList),
    recentSearches: load("ns_recent_searches", [], isSlugList),
    notificationsSeenAt: load("ns_notifications_seen", 0, isCount),
    // Reality-check reminder interval in minutes; 0 = off.
    realityCheckMinutes: load("ns_reality_check", 0, isCount),
    chatOpen: load("ns_chat_open", false, isBoolean),
  }),
  getters: {
    isFavourite: (state) => (slug: string) => state.favourites.includes(slug),
    // Streamer mode masks every balance-like figure, handy when recording.
    money: (state) => (cents: number) => (state.streamerMode ? "$•••••" : formatMoney(cents)),
  },
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      save("ns_sidebar_collapsed", this.sidebarCollapsed);
    },
    toggleStreamerMode() {
      this.streamerMode = !this.streamerMode;
      save("ns_streamer_mode", this.streamerMode);
      useToastStore().push(t(this.streamerMode ? "toasts.streamerOn" : "toasts.streamerOff"), "info",
        this.streamerMode ? "eye-off" : "eye");
    },
    toggleFavourite(slug: string) {
      const adding = !this.isFavourite(slug);
      this.favourites = adding ? [slug, ...this.favourites] : this.favourites.filter((s) => s !== slug);
      save("ns_favourites", this.favourites);
      useToastStore().push(t(adding ? "toasts.favouriteAdded" : "toasts.favouriteRemoved"), "success", "heart");
    },
    clearFavourites() {
      this.favourites = [];
      save("ns_favourites", this.favourites);
    },
    pushRecent(slug: string) {
      this.recent = [slug, ...this.recent.filter((s) => s !== slug)].slice(0, 24);
      save("ns_recent", this.recent);
    },
    clearRecent() {
      this.recent = [];
      save("ns_recent", this.recent);
    },
    rememberSearch(query: string) {
      const q = query.trim();
      if (!q) return;
      this.recentSearches = [q, ...this.recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      save("ns_recent_searches", this.recentSearches);
    },
    clearSearches() {
      this.recentSearches = [];
      save("ns_recent_searches", this.recentSearches);
    },
    toggleChat(open?: boolean) {
      this.chatOpen = open ?? !this.chatOpen;
      this.mobileNavOpen = false;
      save("ns_chat_open", this.chatOpen);
    },
    setRealityCheck(minutes: number) {
      this.realityCheckMinutes = minutes;
      save("ns_reality_check", minutes);
    },
    markNotificationsSeen() {
      this.notificationsSeenAt = Date.now();
      save("ns_notifications_seen", this.notificationsSeenAt);
    },
    openWallet() {
      this.mobileNavOpen = false;
      this.searchOpen = false;
      this.walletOpen = true;
    },
    openSearch() {
      this.mobileNavOpen = false;
      this.searchOpen = true;
    },
  },
});
