import { useEffect, useMemo, useState } from "react"
import { BellRing, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { playSound } from "@/components/ui/sound"
import type { CalendarEvent, Priority, Task } from "@/lib/tasks"
import { alertLevel, alertMoments, buildReminders, formatDuration, type Reminder } from "@/lib/reminders"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

function label(r: Reminder, now: number) {
  const left = r.dueAt - now
  if (r.overdue) return `Overdue by ${formatDuration(-left)}`
  if (left < 1000) return r.kind === "event" ? "Starting now" : "Due now"
  return `${r.kind === "event" ? "Starts" : "Due"} in ${formatDuration(left)}`
}

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

// Alarm for urgent reminders: three sharp beeps, twice.
const URGENT_TONES = [0, 0.25, 0.5, 1.0, 1.25, 1.5].map((delay) => ({
  freq: 988,
  duration: 0.16,
  gain: 0.22,
  type: "square" as OscillatorType,
  delay,
}))

function alert(r: Reminder, stage: "remind" | "due" | "overdue", now: number) {
  const text =
    stage === "due"
      ? `${r.title} · ${r.kind === "event" ? "starting now" : "due now"}`
      : stage === "overdue"
        ? `${r.title} · still not done, ${label(r, now).toLowerCase()}`
        : `${r.title} · ${label(r, now)}`
  const canNotify = typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"

  if (r.priority === "high") {
    toast.urgent(`Urgent: ${text}`)
    playSound(URGENT_TONES)
    navigator.vibrate?.([300, 150, 300, 150, 600])
    if (canNotify) new Notification(`⚠ Urgent: ${r.title}`, { body: text, requireInteraction: true, tag: `${r.id}:${stage}` })
  } else if (r.priority === "medium") {
    toast.info(`Reminder: ${text}`)
    playSound("notify")
    if (canNotify) new Notification(r.title, { body: text, tag: `${r.id}:${stage}` })
  } else {
    toast.quiet(`Low priority: ${text}`)
    if (canNotify) new Notification(r.title, { body: text, silent: true, tag: `${r.id}:${stage}` })
  }
}

// Ticks every second so reminders appear and fire at the exact moment.
// How loudly and how often they alert depends on the task's priority.
// Reminders fire while secretary.ai is open in a tab.
export function RemindersPanel({
  tasks,
  events,
  doneColumnIds,
}: {
  tasks: Task[]
  events: CalendarEvent[]
  doneColumnIds: Set<string>
}) {
  const [now, setNow] = useState(() => Date.now())
  const [showLevels, setShowLevels] = useState(false)
  const supported = typeof window !== "undefined" && "Notification" in window
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported")

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const reminders = useMemo(() => buildReminders(tasks, events, doneColumnIds, now), [tasks, events, doneColumnIds, now])

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
      const due = alertMoments(r).filter((m) => m.at <= now)
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
      if (now - latest.at <= 86_400_000) alert(r, latest.stage, now)
    }
    if (changed) localStorage.setItem(FIRED_KEY, JSON.stringify(fired.slice(-500)))
  }, [reminders, now])

  if (reminders.length === 0 && permission !== "default") return null

  return (
    <Card className="gap-3 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="size-5 text-primary" aria-hidden="true" /> Reminders
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="How priorities change alerts"
            aria-expanded={showLevels}
            onClick={() => setShowLevels((s) => !s)}
          >
            <Info className="size-4" aria-hidden="true" />
          </Button>
          {permission === "default" && (
            <Button variant="outline" className="h-11" onClick={() => void Notification.requestPermission().then(setPermission)}>
              Turn on notifications
            </Button>
          )}
        </div>
      </div>

      {showLevels && (
        <ul className="fade-in flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <li key={p} className="flex gap-2">
              <span className={cn("h-fit shrink-0 rounded-full px-2 text-xs font-medium capitalize", badge[p])}>{p}</span>
              <span>
                <span className="font-medium">{alertLevel[p].label}.</span> {alertLevel[p].summary}
              </span>
            </li>
          ))}
        </ul>
      )}

      {reminders.length === 0 ? (
        <p className="text-base text-muted-foreground">Nothing needs your attention right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((r) => (
            <li
              key={`${r.kind}-${r.id}`}
              className={cn("flex items-center justify-between gap-3 rounded-lg py-2 pl-3 pr-2 text-base", row[r.priority])}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("shrink-0 rounded-full px-2 text-xs font-medium capitalize", badge[r.priority])}>
                  {r.kind === "event" ? "Event" : r.priority}
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
