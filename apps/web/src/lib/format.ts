import { formatMoney } from "./money";
import { intlLocale, t, translateServerError } from "../i18n";

export const formatUsd = formatMoney;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString(intlLocale(), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string | undefined | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function timeAgo(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(intlLocale(), { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 1) return rtf.format(0, "second");
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  return new Date(iso).toLocaleDateString(intlLocale(), { month: "short", day: "numeric", year: "numeric" });
}

// Fastify/zod errors arrive either as a string or as a flattened object.
export function apiErrorMessage(err: unknown, fallback: string) {
  const body = (err as { response?: { data?: { error?: unknown; code?: string; remainingCents?: number } } })?.response
    ?.data;
  if (body?.code === "DEPOSIT_LIMIT" && typeof body.remainingCents === "number") {
    return t("errors.depositLimit", { amount: formatMoney(body.remainingCents) });
  }
  const data = body?.error;
  if (typeof data === "string") return translateServerError(data);
  if (data && typeof data === "object") {
    const fields = (data as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
    // The API words field errors as whole sentences ("Username must be 2–40 characters").
    const [, messages] = Object.entries(fields)[0] ?? [];
    if (messages?.[0]) return translateServerError(messages[0]);
  }
  return fallback;
}
