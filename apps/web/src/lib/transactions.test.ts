import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n";
import { invitedName, notificationCopy, txMeta, txNote } from "./transactions";

afterEach(() => setLocale("en"));

describe("transaction helpers", () => {
  it("labels types per locale and keeps unknown ones", () => {
    expect(txMeta("TOPUP").label).toBe("Deposit");
    setLocale("pl");
    expect(txMeta("REFERRAL_BONUS").label).toBe("Bonus za polecenie");
    expect(txMeta("MYSTERY").label).toBe("MYSTERY");
  });

  it("extracts the invited friend's name", () => {
    expect(invitedName("Referral bonus for inviting Marta W.")).toBe("Marta W.");
    expect(invitedName(null)).toBeNull();
  });

  it("translates the notes the API stores", () => {
    setLocale("pl");
    expect(txNote("Demo top-up via crypto_usdt (simulated, no real payment)")).toBe(
      "Wpłata demo przez USDT (symulacja, bez prawdziwej płatności)"
    );
    expect(txNote("Referral bonus for inviting Kacper99")).toBe("Bonus za zaproszenie: Kacper99");
    expect(txNote("Something custom")).toBe("Something custom");
    expect(txNote(null)).toBe("—");
  });

  it("builds notification copy", () => {
    expect(notificationCopy({ type: "REFERRAL_BONUS", note: "Referral bonus for inviting Luke" })).toEqual({
      title: "New referral",
      text: "Luke joined with your link.",
    });
    expect(notificationCopy({ type: "REFERRAL_BONUS", note: null }).text).toBe("A friend joined with your link.");
  });
});
