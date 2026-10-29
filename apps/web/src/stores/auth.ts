import { defineStore } from "pinia";
import type { PublicUser } from "@novaspin/shared";
import { api } from "../lib/api";
import { clearSession } from "../lib/session";
import { useWalletStore } from "./wallet";

// The session itself is an httpOnly cookie this code can't see; the store
// only mirrors who the API says is signed in.
let checking: Promise<void> | null = null;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as PublicUser | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    /** Asks the API who's signed in; runs once per page load (the router awaits it). */
    init() {
      checking ??= api
        .get<{ user: PublicUser | null }>("/auth/session")
        .then(({ data }) => void (this.user = data.user))
        .catch(() => void (this.user = null));
      return checking;
    },
    async register(payload: { email: string; password: string; displayName: string; referralCode?: string }) {
      const { data } = await api.post<{ user: PublicUser }>("/auth/register", payload);
      this.user = data.user;
    },
    async login(payload: { email: string; password: string; code?: string }) {
      const { data } = await api.post<{ user: PublicUser }>("/auth/login", payload);
      this.user = data.user;
    },
    /** Re-reads the profile (balance, 2FA state…) after it may have changed. */
    async refresh() {
      const { data } = await api.get<PublicUser>("/auth/me");
      this.user = data;
    },
    /** `remote: false` when the server already ended the session (break, deletion). */
    logout({ remote = true }: { remote?: boolean } = {}) {
      // Best effort: the API revokes the session and clears the cookie.
      if (remote && this.user) api.post("/auth/logout").catch(() => {});
      this.user = null;
      clearSession();
      // Don't show the previous account's balance/history to the next login.
      useWalletStore().$reset();
    },
  },
});
