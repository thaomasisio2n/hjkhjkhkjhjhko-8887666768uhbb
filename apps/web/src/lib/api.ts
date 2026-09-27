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

// A revoked/stale token (other device signed it out, demo DB reset) or a
// break in play sends the user back to the login screen instead of leaving
// the UI half-broken.
api.interceptors.response.use(undefined, (error) => {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const auth = useAuthStore();
  if (status === 401 && auth.token) {
    auth.logout({ remote: false });
    window.location.assign("/login");
  } else if (status === 403 && body?.code === "ON_BREAK" && auth.token) {
    auth.logout({ remote: false });
    window.location.assign(`/login?break=${encodeURIComponent(body.until)}`);
  }
  return Promise.reject(error);
});
