import axios from "axios";
import { useAuthStore } from "../stores/auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8787",
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// A stale token (e.g. after the demo database was reset) sends the user back
// to the login screen instead of leaving the UI half-broken.
api.interceptors.response.use(undefined, (error) => {
  if (error?.response?.status === 401) {
    const auth = useAuthStore();
    if (auth.token) {
      auth.logout();
      window.location.assign("/login");
    }
  }
  return Promise.reject(error);
});
