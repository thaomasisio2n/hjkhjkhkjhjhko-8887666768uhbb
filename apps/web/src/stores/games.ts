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
  }),
  actions: {
    async fetchGames() {
      if (this.loaded) return;
      const { data } = await api.get("/games");
      this.games = data.games;
      this.byCategory = data.byCategory;
      this.loaded = true;
    },
  },
});
