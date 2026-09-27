import { defineStore } from "pinia";
import axios from "axios";
import { useWalletStore } from "./wallet";
import { clearSession } from "../lib/session";

interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string | null;
  referralCode: string;
  balanceCents: number;
  totpEnabled?: boolean;
  ghostMode?: boolean;
  createdAt?: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("demo_token") as string | null,
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async register(payload: { email: string; password: string; displayName: string; referralCode?: string }) {
      const { data } = await axios.post(`${API_URL}/auth/register`, payload);
      this.setSession(data.token, data.user);
    },
    async login(payload: { email: string; password: string; code?: string }) {
      const { data } = await axios.post(`${API_URL}/auth/login`, payload);
      this.setSession(data.token, data.user);
    },
    async fetchMe() {
      if (!this.token) return;
      const { data } = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      this.user = data;
    },
    setSession(token: string, user: User) {
      this.token = token;
      this.user = user;
      localStorage.setItem("demo_token", token);
    },
    /** `remote: false` when the server already ended the session (break, deletion). */
    logout({ remote = true }: { remote?: boolean } = {}) {
      // Best effort: revoke this session server-side so the token is dead too.
      if (remote && this.token) {
        axios.post(`${API_URL}/auth/logout`, null, { headers: { Authorization: `Bearer ${this.token}` } }).catch(() => {});
      }
      this.token = null;
      this.user = null;
      localStorage.removeItem("demo_token");
      clearSession();
      // Don't show the previous account's balance/history to the next login.
      useWalletStore().$reset();
    },
  },
});
