import { defineStore } from "pinia";
import { api } from "../lib/api";

export interface Game {
  id: string;
  slug: string;
  title: string;
  provider: string;
  category: string;
  thumbnailUrl: string;
  launchPath: string;
}

export const useGamesStore = defineStore("games", {
  state: () => ({
    games: [] as Game[],
    byCategory: {} as Record<string, Game[]>,
    loaded: false,
    loading: false,
  }),
  getters: {
    bySlug: (state) => (slug: string) => state.games.find((g) => g.slug === slug),
    providers: (state) => {
      const counts = new Map<string, number>();
      for (const g of state.games) counts.set(g.provider, (counts.get(g.provider) ?? 0) + 1);
      return [...counts.entries()].map(([name, count]) => ({ name, count }));
    },
  },
  actions: {
    async fetchGames() {
      if (this.loaded || this.loading) return;
      this.loading = true;
      try {
        const { data } = await api.get("/games");
        this.games = data.games;
        this.byCategory = data.byCategory;
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
  },
});
