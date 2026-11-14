import type { CalendarEvent, Task } from "@/lib/tasks"

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

export type Reminder = {
  id: string
  kind: "task" | "event"
  title: string
  date: string
  overdue: boolean
  /** days until the date (negative when overdue) */
  inDays: number
}

// A reminder is active from `remind_days` before its date until the date passes.
// Overdue tasks stay listed until they are moved to a done column.
export function buildReminders(
  tasks: Task[],
  events: CalendarEvent[],
  doneColumnIds: Set<string>,
  today: string,
): Reminder[] {
  const out: Reminder[] = []
  for (const t of tasks) {
    if (!t.due || t.remind_days == null || t.remind_days < 0 || doneColumnIds.has(t.status)) continue
    if (t.due > today && daysBetween(today, t.due) > t.remind_days) continue
    out.push({
      id: t.id,
      kind: "task",
      title: t.title,
      date: t.due,
      overdue: t.due < today,
      inDays: daysBetween(today, t.due),
    })
  }
  for (const e of events) {
    if (!e.date || e.remind_days == null || e.remind_days < 0) continue
    if (e.date < today) continue
    if (daysBetween(today, e.date) > e.remind_days) continue
    out.push({
      id: e.id,
      kind: "event",
      title: e.title,
      date: e.date,
      overdue: false,
      inDays: daysBetween(today, e.date),
    })
  }
  return out.sort((a, b) => a.inDays - b.inDays)
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
