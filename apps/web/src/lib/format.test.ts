import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n";
import { apiErrorMessage, formatUsd, initials } from "./format";
import { formatDuration } from "./session";

afterEach(() => setLocale("en"));

const axiosError = (data: unknown) => ({ response: { data } });

describe("format helpers", () => {
  it("formats cents as USD", () => {
    expect(formatUsd(5_040_000)).toBe("$50,400.00");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("builds initials", () => {
    expect(initials("Demo Player")).toBe("DP");
    expect(initials("kacper99")).toBe("K");
    expect(initials(undefined)).toBe("?");
  });

  it("formats session durations per locale", () => {
    expect(formatDuration(59_000)).toBe("0 min");
    expect(formatDuration(75 * 60_000)).toBe("1 h 15 min");
    setLocale("pl");
    expect(formatDuration(120 * 60_000)).toBe("2 godz.");
  });
});

describe("apiErrorMessage", () => {
  it("formats the deposit-limit error from its code", () => {
    const msg = apiErrorMessage(axiosError({ error: "…", code: "DEPOSIT_LIMIT", remainingCents: 2_000 }), "fallback");
    expect(msg).toBe("Daily deposit limit reached — you can deposit up to $20.00 more in the next 24 hours.");
  });

  it("translates string errors and summarises zod field errors", () => {
    setLocale("pl");
    expect(apiErrorMessage(axiosError({ error: "Email already registered" }), "x")).toBe("Ten email jest już zarejestrowany");
    const zod = { error: { formErrors: [], fieldErrors: { password: ["String must contain at least 8 character(s)"] } } };
    expect(apiErrorMessage(axiosError(zod), "x")).toBe("password: String must contain at least 8 character(s)");
  });

  it("falls back when there is no response", () => {
    expect(apiErrorMessage(new Error("Network Error"), "API down")).toBe("API down");
  });
});
