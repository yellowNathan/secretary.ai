import type { CalendarEvent, Priority, Task } from "@/lib/tasks"
import { locale, t } from "@/lib/i18n"

// Dates are plain YYYY-MM-DD strings in the user's local calendar.

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString("en-CA")
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  return Math.round((b - a) / 86_400_000)
}

// ── Exact-moment reminders ──────────────────────────────────────────────────
// Every deadline and event has a due moment (date + time, 09:00 when no time
// is set). A reminder fires `remind_before` seconds before that moment.

export const DEFAULT_TIME = "09:00"

/** Due moment in ms since epoch, in the person's local time zone. */
export function dueMoment(date: string, time?: string | null): number {
  const t = time && /^\d{2}:\d{2}(:\d{2})?$/.test(time) ? time : DEFAULT_TIME
  return new Date(`${date}T${t.length === 5 ? `${t}:00` : t}`).getTime()
}

/** Seconds before the due moment to remind, or null for no reminder.
 *  Older rows only have remind_days, which is converted. */
export function remindSeconds(item: { remind_before?: number | null; remind_days?: number | null }): number | null {
  if (item.remind_before != null) return item.remind_before < 0 ? null : item.remind_before
  if (item.remind_days != null && item.remind_days >= 0) return item.remind_days * 86_400
  return null
}

export type Reminder = {
  id: string
  kind: "task" | "event"
  title: string
  dueAt: number
  remindAt: number
  overdue: boolean
  /** Tasks use their own priority; events count as medium. */
  priority: Priority
}

export const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

const MIN = 60_000

/** How hard each priority pushes for attention. */
export const alertLevel: Record<Priority, { label: string; summary: string }> = {
  high: {
    label: "Urgent",
    summary: "Alarm sound, vibration and a pop-up that stays until you close it. Alerts at the reminder time, again when it's due, then every 10 minutes for an hour while overdue.",
  },
  medium: {
    label: "Normal",
    summary: "Chime and a notification at the reminder time, and again when it's due.",
  },
  low: {
    label: "Quiet",
    summary: "One silent notification at the reminder time. No sound.",
  },
}

/** The moments a reminder should alert, by priority. */
export function alertMoments(r: Reminder): { at: number; stage: "remind" | "due" | "overdue" }[] {
  const out: { at: number; stage: "remind" | "due" | "overdue" }[] = [{ at: r.remindAt, stage: "remind" }]
  if (r.priority !== "low" && r.dueAt > r.remindAt) out.push({ at: r.dueAt, stage: "due" })
  if (r.priority === "high" && r.kind === "task") {
    for (let k = 1; k <= 6; k++) out.push({ at: r.dueAt + k * 10 * MIN, stage: "overdue" })
  }
  return out
}

// A reminder shows from its remind moment onwards. Task reminders stay until
// the task is moved to a done column; event reminders clear an hour after the
// event starts.
export function buildReminders(
  tasks: Task[],
  events: CalendarEvent[],
  doneColumnIds: Set<string>,
  now: number,
): Reminder[] {
  const out: Reminder[] = []
  for (const t of tasks) {
    const sec = remindSeconds(t)
    if (!t.due || sec == null || doneColumnIds.has(t.status)) continue
    const dueAt = dueMoment(t.due, t.due_time)
    const remindAt = dueAt - sec * 1000
    if (Number.isNaN(dueAt) || now < remindAt) continue
    out.push({ id: t.id, kind: "task", title: t.title, dueAt, remindAt, overdue: now > dueAt, priority: t.priority ?? "medium" })
  }
  for (const e of events) {
    const sec = remindSeconds(e)
    if (!e.date || sec == null) continue
    const dueAt = dueMoment(e.date, e.time)
    const remindAt = dueAt - sec * 1000
    if (Number.isNaN(dueAt) || now < remindAt || now > dueAt + 3_600_000) continue
    out.push({ id: e.id, kind: "event", title: e.title, dueAt, remindAt, overdue: false, priority: "medium" })
  }
  // Highest priority first, then soonest due.
  return out.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.dueAt - b.dueAt)
}

/** Always HH:MM:SS (24-hour). Empty time means the 09:00:00 default. */
export function hms(time?: string | null): string {
  if (!time) return `${DEFAULT_TIME}:00`
  return time.length === 5 ? `${time}:00` : time.slice(0, 8)
}

/** "14 Nov 2026 · 05:46:30" */
export function formatDueFull(date: string, time?: string | null): string {
  if (!date) return t("No due date")
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return date
  const day = d.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" })
  return `${day} · ${hms(time)}`
}

/** "2d 3h", "4m 10s", "12s" */
export function formatDuration(ms: number): string {
  let s = Math.max(0, Math.round(ms / 1000))
  const d = Math.floor(s / 86_400); s -= d * 86_400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  const u = (n: number, k: "d" | "h" | "m" | "s") => `${n}${t(`unit.${k}`)}`
  if (d) return h ? `${u(d, "d")} ${u(h, "h")}` : u(d, "d")
  if (h) return m ? `${u(h, "h")} ${u(m, "m")}` : u(h, "h")
  if (m) return s ? `${u(m, "m")} ${u(s, "s")}` : u(m, "m")
  return u(s, "s")
}

export const units = [
  { id: "seconds", label: "seconds", sec: 1 },
  { id: "minutes", label: "minutes", sec: 60 },
  { id: "hours", label: "hours", sec: 3600 },
  { id: "days", label: "days", sec: 86_400 },
  { id: "weeks", label: "weeks", sec: 604_800 },
] as const

/** "At the due time", "10 seconds before", "1 day before" */
export function formatOffset(sec: number | null): string {
  if (sec == null || sec < 0) return t("No reminder")
  if (sec === 0) return t("At the due time")
  const unit = [...units].reverse().find((u) => sec % u.sec === 0) ?? units[0]
  const n = sec / unit.sec
  return n === 1 ? t(`1 ${unit.label.slice(0, -1)} before`) : t(`{n} ${unit.label} before`, { n })
}

// Opens Google Calendar's "new event" page pre-filled with the item.
export function googleCalendarUrl(opts: { title: string; date: string; time?: string; details?: string }): string {
  const day = opts.date.replace(/-/g, "")
  let dates: string
  if (opts.time) {
    const start = new Date(`${opts.date}T${opts.time}:00`)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-CA").replace(/-/g, "") +
      "T" +
      d.toTimeString().slice(0, 8).replace(/:/g, "")
    dates = `${fmt(start)}/${fmt(end)}`
  } else {
    dates = `${day}/${addDays(opts.date, 1).replace(/-/g, "")}`
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
    details: opts.details ?? "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
