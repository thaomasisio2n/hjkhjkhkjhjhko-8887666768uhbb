import type { IconName } from "./icons";
import { t } from "../i18n";

const META: Record<string, { icon: IconName; tone: string }> = {
  TOPUP: { icon: "wallet", tone: "bg-blue/15 text-blue-hover" },
  REFERRAL_BONUS: { icon: "users", tone: "bg-violet-500/15 text-violet-300" },
  WELCOME_BONUS: { icon: "gift", tone: "bg-accent/15 text-accent" },
  ADJUSTMENT: { icon: "layers", tone: "bg-ink-600 text-ink-300" },
};

export function txMeta(type: string) {
  const meta = META[type] ?? { icon: "layers" as IconName, tone: "bg-ink-600 text-ink-300" };
  return { ...meta, label: META[type] ? t(`tx.${type}`) : type };
}

// Referral bonus notes read "Referral bonus for inviting <name>".
export function invitedName(note: string | null) {
  return note?.match(/inviting (.+)$/)?.[1] ?? null;
}

// Notes are stored in English by the API; known patterns are shown translated.
export function txNote(note: string | null) {
  if (!note) return "—";
  let m: RegExpMatchArray | null;
  if ((m = note.match(/^Demo top-up via (\S+) \(simulated, no real payment\)$/)))
    return t("tx.noteTopup", { method: m[1]!.replace("crypto_", "").toUpperCase() });
  if ((m = note.match(/^Referral bonus for inviting (.+)$/))) return t("tx.noteReferral", { name: m[1]! });
  if ((m = note.match(/^Demo welcome bonus, invited by (.+) \(fake balance, no real value\)$/)))
    return t("tx.noteWelcomeInvited", { name: m[1]! });
  if (note === "Demo welcome bonus (fake balance, no real value)") return t("tx.noteWelcome");
  if (note === "Seeded demo account balance (fake, no real value)") return t("tx.noteSeed");
  return note;
}

export function notificationCopy(tx: { type: string; note: string | null }) {
  switch (tx.type) {
    case "TOPUP":
      return { title: t("notifications.depositTitle"), text: t("notifications.depositText") };
    case "REFERRAL_BONUS":
      return {
        title: t("notifications.referralTitle"),
        text: t("notifications.referralText", { name: invitedName(tx.note) ?? t("notifications.aFriend") }),
      };
    case "WELCOME_BONUS":
      return { title: t("notifications.welcomeTitle"), text: t("notifications.welcomeText") };
    default:
      return { title: t("notifications.adjustTitle"), text: tx.note ? txNote(tx.note) : t("notifications.adjustText") };
  }
}
