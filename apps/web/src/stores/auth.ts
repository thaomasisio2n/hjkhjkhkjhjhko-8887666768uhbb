import { defineStore } from "pinia";
import axios from "axios";

interface User {
  id: string;
  email: string;
  displayName: string;
  referralCode: string;
  balanceCents: number;
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
    async login(payload: { email: string; password: string }) {
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
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("demo_token");
    },
  },
});
