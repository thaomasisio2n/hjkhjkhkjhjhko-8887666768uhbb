import { defineStore } from "pinia";

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
    mobileNavOpen: false,
    walletOpen: false,
    searchFocusTick: 0,
    favourites: load<string[]>("ns_favourites", []),
    recent: load<string[]>("ns_recent", []),
  }),
  getters: {
    isFavourite: (state) => (slug: string) => state.favourites.includes(slug),
  },
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      save("ns_sidebar_collapsed", this.sidebarCollapsed);
    },
    toggleFavourite(slug: string) {
      this.favourites = this.isFavourite(slug)
        ? this.favourites.filter((s) => s !== slug)
        : [slug, ...this.favourites];
      save("ns_favourites", this.favourites);
    },
    pushRecent(slug: string) {
      this.recent = [slug, ...this.recent.filter((s) => s !== slug)].slice(0, 24);
      save("ns_recent", this.recent);
    },
    openWallet() {
      this.mobileNavOpen = false;
      this.walletOpen = true;
    },
    focusSearch() {
      this.searchFocusTick++;
    },
  },
});
