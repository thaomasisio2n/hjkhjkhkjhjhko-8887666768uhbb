import { defineStore } from "pinia";
import { formatUsd } from "../lib/format";
import { useToastStore } from "./toast";

// Per-browser UI conveniences. Storage can be unavailable (private mode,
// blocked site data), so every access is guarded and falls back gracefully.
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
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
    sidebarCollapsed: load("ns_sidebar_collapsed", false),
    streamerMode: load("ns_streamer_mode", false),
    mobileNavOpen: false,
    walletOpen: false,
    searchOpen: false,
    favourites: load<string[]>("ns_favourites", []),
    recent: load<string[]>("ns_recent", []),
    recentSearches: load<string[]>("ns_recent_searches", []),
  }),
  getters: {
    isFavourite: (state) => (slug: string) => state.favourites.includes(slug),
    // Streamer mode masks every balance-like figure, handy when recording.
    money: (state) => (cents: number) => (state.streamerMode ? "$•••••" : formatUsd(cents)),
  },
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      save("ns_sidebar_collapsed", this.sidebarCollapsed);
    },
    toggleStreamerMode() {
      this.streamerMode = !this.streamerMode;
      save("ns_streamer_mode", this.streamerMode);
      useToastStore().push(this.streamerMode ? "Streamer mode on — balances hidden" : "Streamer mode off", "info",
        this.streamerMode ? "eye-off" : "eye");
    },
    toggleFavourite(slug: string) {
      const adding = !this.isFavourite(slug);
      this.favourites = adding ? [slug, ...this.favourites] : this.favourites.filter((s) => s !== slug);
      save("ns_favourites", this.favourites);
      useToastStore().push(adding ? "Added to favourites" : "Removed from favourites", "success", "heart");
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
