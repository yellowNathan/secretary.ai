import { useSyncExternalStore } from "react"
import zhHant from "@/lib/locales/zh-Hant"
import zhHans from "@/lib/locales/zh-Hans"
import fr from "@/lib/locales/fr"
import de from "@/lib/locales/de"
import es from "@/lib/locales/es"
import it from "@/lib/locales/it"
import ja from "@/lib/locales/ja"
import ko from "@/lib/locales/ko"
import th from "@/lib/locales/th"
import vi from "@/lib/locales/vi"
import id from "@/lib/locales/id"
import hi from "@/lib/locales/hi"
import { extra } from "@/lib/locales/extra"
import { settingsDicts as s } from "@/lib/locales/settings-i18n"

// App language. Keys are the British English text; every other language maps
// that text to its own wording. Missing entries fall back to English.
export type Dict = Record<string, string>

export const languages = [
  { code: "en-US", label: "English (US)", short: "EN-US", locale: "en-US", group: "English" },
  { code: "en-GB", label: "English (UK)", short: "EN-UK", locale: "en-GB", group: "English" },
  { code: "zh-Hant", label: "繁體中文", short: "繁", locale: "zh-TW", group: "Asia" },
  { code: "zh-Hans", label: "简体中文", short: "简", locale: "zh-CN", group: "Asia" },
  { code: "ja", label: "日本語", short: "日本", locale: "ja-JP", group: "Asia" },
  { code: "ko", label: "한국어", short: "한", locale: "ko-KR", group: "Asia" },
  { code: "th", label: "ไทย", short: "TH", locale: "th-TH", group: "Asia" },
  { code: "vi", label: "Tiếng Việt", short: "VI", locale: "vi-VN", group: "Asia" },
  { code: "id", label: "Bahasa Indonesia", short: "ID", locale: "id-ID", group: "Asia" },
  { code: "hi", label: "हिन्दी", short: "हि", locale: "hi-IN", group: "Asia" },
  { code: "fr", label: "Français", short: "FR", locale: "fr-FR", group: "Europe" },
  { code: "de", label: "Deutsch", short: "DE", locale: "de-DE", group: "Europe" },
  { code: "es", label: "Español", short: "ES", locale: "es-ES", group: "Europe" },
  { code: "it", label: "Italiano", short: "IT", locale: "it-IT", group: "Europe" },
] as const

export type Lang = (typeof languages)[number]["code"]

// English base: only the short unit letters need spelling out.
const en: Dict = { "unit.d": "d", "unit.h": "h", "unit.m": "m", "unit.s": "s" }

// American spelling and wording where it differs from British.
const enUS: Dict = {
  "Organise your work, neatly.": "Organize your work, neatly.",
  "Make your first column, like “To do”, to start organising your work.":
    "Make your first column, like “To do”, to start organizing your work.",
  "Ask for help planning, prioritising or writing up your work.":
    "Ask for help planning, prioritizing or writing up your work.",
  "Book team offsite": "Book team off-site",
}

const dicts: Record<Lang, Dict> = {
  "en-US": { ...en, ...enUS },
  "en-GB": en,
  "zh-Hant": { ...zhHant, ...extra.zhHant, ...s.zhHant },
  "zh-Hans": { ...zhHans, ...extra.zhHans, ...s.zhHans },
  ja: { ...ja, ...s.ja },
  ko: { ...ko, ...s.ko },
  th: { ...th, ...s.th },
  vi: { ...vi, ...s.vi },
  id: { ...id, ...s.id },
  hi: { ...hi, ...s.hi },
  fr: { ...fr, ...extra.fr, ...s.fr },
  de: { ...de, ...extra.de, ...s.de },
  es: { ...es, ...extra.es, ...s.es },
  it: { ...it, ...extra.it, ...s.it },
}

const KEY = "lang"
const listeners = new Set<() => void>()

function detect(): Lang {
  const nav = (typeof navigator !== "undefined" ? navigator.language : "en-GB").toLowerCase()
  if (nav.startsWith("zh")) return /tw|hk|mo|hant/.test(nav) ? "zh-Hant" : "zh-Hans"
  if (nav === "en-us") return "en-US"
  if (nav.startsWith("ms")) return "id"
  for (const l of ["ja", "ko", "th", "vi", "id", "hi", "fr", "de", "es", "it"] as const) if (nav.startsWith(l)) return l
  return "en-GB"
}

let current: Lang = (() => {
  if (typeof localStorage === "undefined") return "en-GB"
  const saved = localStorage.getItem(KEY)
  return languages.some((l) => l.code === saved) ? (saved as Lang) : detect()
})()

function syncHtml() {
  if (typeof document !== "undefined") document.documentElement.lang = current
}
syncHtml()

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang) {
  current = lang
  localStorage.setItem(KEY, lang)
  syncHtml()
  listeners.forEach((l) => l())
}

/** Locale code for dates and numbers, e.g. "en-GB" or "zh-TW". */
export function locale(): string {
  return languages.find((l) => l.code === current)?.locale ?? "en-GB"
}

/** Translate. Use {name} placeholders: t("Deleted “{name}”", { name }). */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? en[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** Re-renders the component when the language changes; returns t. */
export function useT() {
  useSyncExternalStore(subscribe, getLang, getLang)
  return t
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}
