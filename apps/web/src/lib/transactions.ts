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
