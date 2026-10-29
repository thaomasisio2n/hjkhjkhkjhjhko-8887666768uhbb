import { afterEach, describe, expect, it } from "vitest";
import { setLocale } from "../i18n";
import { describeUserAgent } from "./userAgent";

afterEach(() => setLocale("en"));

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("describeUserAgent", () => {
  it("names browser and OS", () => {
    expect(describeUserAgent(CHROME_WIN)).toBe("Chrome on Windows");
    expect(describeUserAgent(SAFARI_IOS)).toBe("Safari on iOS");
    expect(describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("Firefox on Linux");
  });

  it("handles missing or odd agents and translates", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
    expect(describeUserAgent("curl/8.5.0")).toBe("API client");
    setLocale("pl");
    expect(describeUserAgent(CHROME_WIN)).toBe("Chrome na Windows");
  });
});
