import { t } from "../i18n";

// Just enough parsing to label a session ("Chrome on Windows").
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return t("settings.unknownDevice");
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /curl|node|axios|undici/i.test(ua) ? "API client"
    : null;
  const os =
    /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : null;
  if (browser && os) return t("settings.deviceOn", { browser, os });
  return browser ?? os ?? t("settings.unknownDevice");
}
