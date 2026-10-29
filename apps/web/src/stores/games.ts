import { defineStore } from "pinia";
import { api } from "../lib/api";
import { slugify } from "../lib/categories";

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
      const byName = new Map<string, Game[]>();
      for (const g of state.games) byName.set(g.provider, [...(byName.get(g.provider) ?? []), g]);
      return [...byName.entries()]
        .map(([name, games]) => ({ name, slug: slugify(name), count: games.length, games }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
