import { ref } from "vue";
import en from "./en";
import pl from "./pl";

// Tiny i18n: nested dictionaries, `{name}` interpolation and CLDR plurals.
// `t()` reads the reactive locale, so templates/computeds re-render on switch.

export type Locale = "en" | "pl";
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pl", label: "Polski" },
];

type Plural = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
type Tree = { [key: string]: string | Plural | Tree };

const messages: Record<Locale, Tree> = { en, pl };
const STORAGE_KEY = "ns_locale";

function detect(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "pl") return saved;
  } catch {
    // storage unavailable
  }
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  return language?.toLowerCase().startsWith("pl") ? "pl" : "en";
}

function syncHtmlLang(value: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = value;
}

export const locale = ref<Locale>(detect());
syncHtmlLang(locale.value);

export function setLocale(next: Locale) {
  locale.value = next;
  syncHtmlLang(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // non-critical
  }
}

/** BCP 47 tag for Intl formatters. */
export function intlLocale() {
  return locale.value === "pl" ? "pl-PL" : "en-US";
}

function lookup(tree: Tree, key: string): string | Plural | undefined {
  let node: string | Plural | Tree | undefined = tree;
  for (const part of key.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = (node as Tree)[part];
  }
  return node as string | Plural | undefined;
}

function interpolate(message: string, params?: Record<string, string | number>) {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

function resolve(key: string) {
  const found = lookup(messages[locale.value], key) ?? lookup(messages.en, key);
  if (found === undefined && import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
  return found;
}

/** Whether a message exists (in the active locale or the English fallback). */
export function te(key: string): boolean {
  return (lookup(messages[locale.value], key) ?? lookup(messages.en, key)) !== undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const found = resolve(key);
  if (typeof found !== "string") return key;
  return interpolate(found, params);
}

/** Pluralised message; `{count}` is available in the string. */
export function tc(key: string, count: number, params?: Record<string, string | number>): string {
  const found = resolve(key);
  if (!found) return key;
  if (typeof found === "string") return interpolate(found, { count, ...params });
  const rule = new Intl.PluralRules(intlLocale()).select(count);
  return interpolate(found[rule] ?? found.other, { count, ...params });
}
