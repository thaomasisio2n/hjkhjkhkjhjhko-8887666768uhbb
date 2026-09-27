import type { IconName } from "./icons";

const META: Record<string, { label: string; icon: IconName; tone: string }> = {
  TOPUP: { label: "Deposit", icon: "wallet", tone: "bg-blue/15 text-blue-hover" },
  REFERRAL_BONUS: { label: "Referral bonus", icon: "users", tone: "bg-violet-500/15 text-violet-300" },
  WELCOME_BONUS: { label: "Welcome bonus", icon: "gift", tone: "bg-accent/15 text-accent" },
  ADJUSTMENT: { label: "Adjustment", icon: "layers", tone: "bg-ink-600 text-ink-300" },
};

export function txMeta(type: string) {
  return META[type] ?? { label: type, icon: "layers" as IconName, tone: "bg-ink-600 text-ink-300" };
}

// Referral bonus notes read "Referral bonus for inviting <name>".
export function invitedName(note: string | null) {
  return note?.match(/inviting (.+)$/)?.[1] ?? null;
}

export function notificationCopy(tx: { type: string; note: string | null }) {
  switch (tx.type) {
    case "TOPUP":
      return { title: "Deposit credited", text: "Simulated top-up added to your demo balance." };
    case "REFERRAL_BONUS":
      return { title: "New referral", text: `${invitedName(tx.note) ?? "A friend"} joined with your link.` };
    case "WELCOME_BONUS":
      return { title: "Welcome to NovaSpin", text: "Your demo welcome balance is ready." };
    default:
      return { title: "Balance adjusted", text: tx.note ?? "Your demo balance changed." };
  }
}
