import { useEffect } from "react"
import { BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Reminder } from "@/lib/reminders"
import { todayISO } from "@/lib/reminders"

function label(r: Reminder) {
  if (r.overdue) return `Overdue by ${-r.inDays} day${r.inDays === -1 ? "" : "s"}`
  if (r.inDays === 0) return r.kind === "event" ? "Today" : "Due today"
  if (r.inDays === 1) return r.kind === "event" ? "Tomorrow" : "Due tomorrow"
  return `In ${r.inDays} days`
}

// Shows active deadline and event reminders. When the person has allowed
// notifications, each reminder also raises a browser notification once per day.
export function RemindersPanel({ reminders }: { reminders: Reminder[] }) {
  const supported = typeof window !== "undefined" && "Notification" in window
  const permission = supported ? Notification.permission : "unsupported"

  useEffect(() => {
    if (!supported || Notification.permission !== "granted") return
    const key = `reminded:${todayISO()}`
    const sent = new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"))
    for (const r of reminders) {
      if (sent.has(r.id)) continue
      new Notification(r.title, { body: label(r) })
      sent.add(r.id)
    }
    localStorage.setItem(key, JSON.stringify([...sent]))
  }, [reminders, supported])

  if (reminders.length === 0 && permission !== "default") return null

  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <BellRing className="size-4" aria-hidden="true" /> Reminders
        </h2>
        {permission === "default" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void Notification.requestPermission()}
          >
            Turn on notifications
          </Button>
        )}
      </div>
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{r.kind === "event" ? "Event" : "Task"} · </span>
                {r.title}
              </span>
              <span className={r.overdue ? "shrink-0 font-medium text-destructive" : "shrink-0 text-muted-foreground"}>
                {label(r)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
