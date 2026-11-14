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
import { assistantActionsDicts as a } from "@/lib/locales/assistant-actions-i18n"
import { demoAssistantDicts as demo } from "@/lib/locales/demo-assistant-i18n"
import { secretaryDicts as secretary } from "@/lib/locales/secretary-i18n"

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
  "zh-Hant": { ...zhHant, ...extra.zhHant, ...s.zhHant, "Your secretary": "你的秘書" },
  "zh-Hans": { ...zhHans, ...extra.zhHans, ...s.zhHans, "Your secretary": "你的秘书" },
  ja: { ...ja, ...s.ja, "Your secretary": "あなたの秘書" },
  ko: { ...ko, ...s.ko, "Your secretary": "나의 비서" },
  th: { ...th, ...s.th, "Your secretary": "เลขานุการของคุณ" },
  vi: { ...vi, ...s.vi, "Your secretary": "Thư ký của bạn" },
  id: { ...id, ...s.id, "Your secretary": "Sekretaris Anda" },
  hi: { ...hi, ...s.hi, "Your secretary": "आपका सचिव" },
  fr: { ...fr, ...extra.fr, ...s.fr, "Your secretary": "Votre secrétaire" },
  de: { ...de, ...extra.de, ...s.de, "Your secretary": "Ihre Sekretärin" },
  es: { ...es, ...extra.es, ...s.es, "Your secretary": "Tu secretario" },
  it: { ...it, ...extra.it, ...s.it, "Your secretary": "Il tuo segretario" },
}

for (const [lang, key] of Object.entries({ "zh-Hant": "zhHant", "zh-Hans": "zhHans", ja: "ja", ko: "ko", th: "th", vi: "vi", id: "id", hi: "hi", fr: "fr", de: "de", es: "es", it: "it" })) Object.assign(dicts[lang as Lang], a[key], demo[key], secretary[key])

const workspaceNotice: Partial<Record<Lang, string>> = {
  "zh-Hant": "每次傳送訊息時，你的看板和日曆資料會傳送給 AI。助理可以提出修改建議，但無法替你修改。",
  "zh-Hans": "每次发送消息时，你的看板和日历资料会发送给 AI。助理可以提出修改建议，但无法替你修改。",
  ja: "メッセージを送るたびに、ボードとカレンダーの情報が AI に送信されます。アシスタントは変更を提案できますが、代わりに変更することはできません。",
  ko: "메시지를 보낼 때마다 보드와 캘린더 정보가 AI에 전송됩니다. 비서는 변경 사항을 제안할 수 있지만 직접 변경할 수는 없습니다.",
  th: "รายละเอียดบอร์ดและปฏิทินจะถูกส่งไปยัง AI พร้อมกับทุกข้อความ ผู้ช่วยเสนอการเปลี่ยนแปลงได้ แต่ไม่สามารถเปลี่ยนให้คุณได้",
  vi: "Thông tin bảng công việc và lịch của bạn được gửi tới AI cùng mỗi tin nhắn. Trợ lý có thể đề xuất thay đổi nhưng không thể thay đổi giúp bạn.",
  id: "Detail papan dan kalender Anda dikirim ke AI bersama setiap pesan. Asisten dapat menyarankan perubahan, tetapi tidak dapat melakukannya untuk Anda.",
  hi: "हर संदेश के साथ आपके बोर्ड और कैलेंडर की जानकारी AI को भेजी जाती है। सहायक बदलाव सुझा सकता है, लेकिन आपके लिए बदलाव नहीं कर सकता।",
  fr: "Les détails de votre tableau et de votre calendrier sont envoyés à l’IA avec chaque message. L’assistant peut suggérer des modifications, mais ne peut pas les effectuer pour vous.",
  de: "Ihre Pinnwand- und Kalenderdaten werden mit jeder Nachricht an die KI gesendet. Der Assistent kann Änderungen vorschlagen, aber nicht für Sie vornehmen.",
  es: "Los datos de tu tablero y calendario se envían a la IA con cada mensaje. El asistente puede sugerir cambios, pero no hacerlos por ti.",
  it: "I dettagli della tua bacheca e del calendario vengono inviati all’IA con ogni messaggio. L’assistente può suggerire modifiche, ma non può apportarle per te.",
}
for (const [lang, text] of Object.entries(workspaceNotice)) {
  if (text) dicts[lang as Lang]["Your board and calendar details are sent to the AI with each message. The assistant can suggest changes, but cannot make them for you."] = text
}

const regionError: Partial<Record<Lang, string>> = {
  "zh-Hant": "此 AI 模型在此地區無法使用。請稍後再試或聯絡 omg.dev 支援。",
  "zh-Hans": "此 AI 模型在此地区不可用。请稍后重试或联系 omg.dev 支持。",
  ja: "この地域では AI モデルを利用できません。後でもう一度お試しいただくか、omg.dev サポートにお問い合わせください。",
  ko: "이 지역에서는 AI 모델을 사용할 수 없습니다. 나중에 다시 시도하거나 omg.dev 지원팀에 문의하세요.",
  th: "โมเดล AI ไม่พร้อมใช้งานในภูมิภาคนี้ โปรดลองอีกครั้งภายหลังหรือติดต่อฝ่ายสนับสนุน omg.dev",
  vi: "Mô hình AI không khả dụng ở khu vực này. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ omg.dev.",
  id: "Model AI tidak tersedia di wilayah ini. Coba lagi nanti atau hubungi dukungan omg.dev.",
  hi: "इस क्षेत्र में AI मॉडल उपलब्ध नहीं है। कृपया बाद में फिर कोशिश करें या omg.dev सहायता से संपर्क करें।",
  fr: "Le modèle d’IA n’est pas disponible dans cette région. Réessayez plus tard ou contactez l’assistance omg.dev.",
  de: "Das KI-Modell ist in dieser Region nicht verfügbar. Versuchen Sie es später erneut oder kontaktieren Sie den omg.dev-Support.",
  es: "El modelo de IA no está disponible en esta región. Inténtalo más tarde o contacta con el soporte de omg.dev.",
  it: "Il modello IA non è disponibile in questa regione. Riprova più tardi o contatta l’assistenza omg.dev.",
}
for (const [lang, text] of Object.entries(regionError)) {
  if (text) dicts[lang as Lang]["The AI model is not available in this region. Please try again later or contact omg.dev support."] = text
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
