import axios from "axios";
import { isApiErrorCode, type ApiErrorBody } from "@novaspin/shared";

// The only HTTP client in the app. It talks to /api on this same origin
// (nginx or the Vite dev server forwards it), and the browser attaches the
// httpOnly session cookie by itself: no token ever touches JavaScript.
export const api = axios.create({ baseURL: "/api" });

/** The API's error body, if this is an API error at all. */
export function apiErrorBody(err: unknown): ApiErrorBody | undefined {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response?.data;
  return data && typeof data === "object" && isApiErrorCode((data as ApiErrorBody).code) ? (data as ApiErrorBody) : undefined;
}

// A revoked or expired session (another device signed it out, a break, a
// ban) sends the user back to sign-in instead of leaving the UI half-broken.
// A full page load also wipes every store.
api.interceptors.response.use(undefined, (error) => {
  const body = apiErrorBody(error);
  const onSignedInPage = !["/login", "/register"].includes(window.location.pathname);
  if (body?.code === "UNAUTHORIZED" && onSignedInPage) {
    window.location.assign("/login");
  } else if (body?.code === "ON_BREAK" && body.until) {
    window.location.assign(`/login?break=${encodeURIComponent(body.until)}`);
  }
  return Promise.reject(error);
});
