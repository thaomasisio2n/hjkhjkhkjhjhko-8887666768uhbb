export function formatUsd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
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
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Fastify/zod errors arrive either as a string or as a flattened object.
export function apiErrorMessage(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const fields = (data as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
    const [field, messages] = Object.entries(fields)[0] ?? [];
    if (field && messages?.[0]) return `${field}: ${messages[0]}`;
  }
  return fallback;
}
