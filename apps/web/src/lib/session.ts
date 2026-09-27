import { t } from "../i18n";

// Start of the current signed-in session, per browser tab (survives reloads,
// cleared on logout). Used by the reality-check reminder and Settings.
const KEY = "ns_session_start";

export function sessionStart(): number {
  try {
    const stored = Number(sessionStorage.getItem(KEY));
    if (stored > 0) return stored;
    const now = Date.now();
    sessionStorage.setItem(KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // non-critical
  }
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 60) return t("duration.minutes", { m: minutes });
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? t("duration.hoursMinutes", { h: hours, m: minutes % 60 }) : t("duration.hours", { h: hours });
}
