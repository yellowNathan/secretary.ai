import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { BellOff, BellRing, Info, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { CalendarEvent, Priority, Task } from "@/lib/tasks"
import { alertLevel, alertMoments, buildReminders, formatDuration, type Reminder } from "@/lib/reminders"
import { describeLevel, playRingtone, useReminderSettings, type ReminderSettings } from "@/lib/reminder-settings"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { t, useT } from "@/lib/i18n"

function label(r: Reminder, now: number) {
  const left = r.dueAt - now
  if (r.overdue) return t("Overdue by {d}", { d: formatDuration(-left) })
  if (left < 1000) return t(r.kind === "event" ? "Starting now" : "Due now")
  return t(r.kind === "event" ? "Starts in {d}" : "Due in {d}", { d: formatDuration(left) })
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const FIRED_KEY = "reminders:fired"

const badge: Record<Priority, string> = {
  high: "bg-destructive text-primary-foreground",
  medium: "bg-primary/15 text-primary",
  low: "bg-muted text-muted-foreground",
}
const row: Record<Priority, string> = {
  high: "border-l-4 border-destructive bg-destructive/5",
  medium: "border-l-4 border-primary/60",
  low: "border-l-4 border-border text-muted-foreground",
}

// How each reminder alerts comes from the person's settings for its priority.
function alert(r: Reminder, stage: "remind" | "due" | "overdue", now: number, settings: ReminderSettings) {
  if (!settings.alerts) return
  const level = settings.levels[r.priority]
  const text =
    stage === "due"
      ? `${r.title} · ${t(r.kind === "event" ? "starting now" : "due now")}`
      : stage === "overdue"
        ? `${r.title} · ${t("still not done, overdue by {d}", { d: formatDuration(now - r.dueAt) })}`
        : `${r.title} · ${label(r, now)}`
  const canNotify = typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"

  const urgent = r.priority === "high"
  const message = urgent
    ? t("Urgent: {text}", { text })
    : r.priority === "medium"
      ? t("Reminder: {text}", { text })
      : t("Low priority: {text}", { text })

  if (level.popup === "stay") toast.urgent(message)
  else if (level.popup === "brief") (r.priority === "low" ? toast.quiet : toast.info)(message)
  playRingtone(level.ringtone, level.volume)
  if (level.vibrate) navigator.vibrate?.(urgent ? [300, 150, 300, 150, 600] : [200, 100, 200])
  if (canNotify && level.notify) {
    new Notification(urgent ? `⚠ ${t("Urgent: {text}", { text: r.title })}` : r.title, {
      body: text,
      requireInteraction: level.popup === "stay",
      silent: level.ringtone === "none",
      tag: `${r.id}:${stage}`,
    })
  }
}

// Ticks every second so reminders appear and fire at the exact moment.
// How loudly and how often they alert depends on the task's priority.
// Reminders fire while secretary.ai is open in a tab.
export function RemindersPanel({
  tasks,
  events,
  doneColumnIds,
  showSettingsLink = true,
}: {
  tasks: Task[]
  events: CalendarEvent[]
  doneColumnIds: Set<string>
  /** Off in the demo, where settings aren't available. */
  showSettingsLink?: boolean
}) {
  useT()
  const settings = useReminderSettings()
  const [now, setNow] = useState(() => Date.now())
  const [showLevels, setShowLevels] = useState(false)
  const supported = typeof window !== "undefined" && "Notification" in window
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported")

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const reminders = useMemo(
    () => buildReminders(tasks, events, doneColumnIds, now, settings),
    [tasks, events, doneColumnIds, now, settings],
  )

  useEffect(() => {
    let fired: string[] = []
    try {
      fired = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "[]")
    } catch {
      fired = []
    }
    const seen = new Set(fired)
    let changed = false
    for (const r of reminders) {
      const due = alertMoments(r, settings.levels[r.priority]).filter((m) => m.at <= now)
      const fresh = due.filter((m) => !seen.has(`${r.kind}:${r.id}:${m.at}`))
      if (fresh.length === 0) continue
      for (const m of fresh) {
        const key = `${r.kind}:${r.id}:${m.at}`
        seen.add(key)
        fired.push(key)
      }
      changed = true
      // Only alert for the latest missed moment, and skip ones over a day old.
      const latest = fresh[fresh.length - 1]
      if (now - latest.at <= 86_400_000) alert(r, latest.stage, now, settings)
    }
    if (changed) localStorage.setItem(FIRED_KEY, JSON.stringify(fired.slice(-500)))
  }, [reminders, now, settings])

  if (reminders.length === 0 && permission !== "default") return null

  return (
    <Card className="gap-3 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {settings.alerts ? (
            <BellRing className="size-5 text-primary" aria-hidden="true" />
          ) : (
            <BellOff className="size-5 text-muted-foreground" aria-hidden="true" />
          )}{" "}
          {t("Reminders")}
          {!settings.alerts && <span className="text-sm font-normal text-muted-foreground">· {t("Alerts off")}</span>}
        </h2>
        <div className="flex items-center gap-1">
          {showSettingsLink && (
            <Link
              to="/settings"
              aria-label={t("Reminder settings")}
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={t("How priorities change alerts")}
            aria-expanded={showLevels}
            onClick={() => setShowLevels((s) => !s)}
          >
            <Info className="size-4" aria-hidden="true" />
          </Button>
          {permission === "default" && (
            <Button variant="outline" className="h-11" onClick={() => void Notification.requestPermission().then(setPermission)}>
              {t("Turn on notifications")}
            </Button>
          )}
        </div>
      </div>

      {showLevels && (
        <ul className="fade-in flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <li key={p} className="flex gap-2">
              <span className={cn("h-fit shrink-0 rounded-full px-2 text-xs font-medium capitalize", badge[p])}>{t(cap(p))}</span>
              <span>
                <span className="font-medium">{t(alertLevel[p].label)}.</span> {describeLevel(settings.levels[p])}
              </span>
            </li>
          ))}
        </ul>
      )}

      {reminders.length === 0 ? (
        <p className="text-base text-muted-foreground">{t("Nothing needs your attention right now.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((r) => (
            <li
              key={`${r.kind}-${r.id}`}
              className={cn("flex items-center justify-between gap-3 rounded-lg py-2 pl-3 pr-2 text-base", row[r.priority])}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("shrink-0 rounded-full px-2 text-xs font-medium capitalize", badge[r.priority])}>
                  {t(r.kind === "event" ? "Event" : cap(r.priority))}
                </span>
                <span className={cn("truncate", r.priority === "high" && "font-semibold")}>{r.title}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  r.overdue ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                {label(r, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
