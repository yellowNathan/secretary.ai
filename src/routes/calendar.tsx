import { useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { CalendarPlus, ChevronLeft, ChevronRight, ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { RemindersPanel } from "@/components/reminders-panel"
import { addDays, buildReminders, googleCalendarUrl, todayISO } from "@/lib/reminders"
import { cn } from "@/lib/utils"
import type { CalendarEvent, Column, Task } from "@/lib/tasks"

export const Route = createFileRoute("/calendar")({ component: CalendarPage })

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

// The grid runs Sunday to Saturday and covers whole weeks around the month.
function gridDays(firstOfMonth: string): string[] {
  const first = new Date(`${firstOfMonth}T00:00:00`)
  const offset = first.getDay()
  const start = addDays(firstOfMonth, -offset)
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
}

function CalendarPage() {
  const tasksHook = useCollection<Task>({ collection: "tasks", api: "/api/tasks" })
  const eventsHook = useCollection<CalendarEvent>({ collection: "events", api: "/api/events" })
  const columnsHook = useCollection<Column>({ collection: "columns", api: "/api/columns" })
  const tasks = tasksHook.data as Task[]
  const events = eventsHook.data as CalendarEvent[]
  const columns = columnsHook.data as Column[]

  const today = todayISO()
  const [month, setMonth] = useState(monthStart(today))
  const [selected, setSelected] = useState(today)

  const doneIds = useMemo(() => new Set(columns.filter((c) => c.done).map((c) => c.id)), [columns])
  const reminders = useMemo(
    () => buildReminders(tasks, events, doneIds, today),
    [tasks, events, doneIds, today],
  )

  const days = useMemo(() => gridDays(month), [month])
  const monthLabel = new Date(`${month}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  const tasksOn = (day: string) => tasks.filter((t) => t.due === day)
  const eventsOn = (day: string) => events.filter((e) => e.date === day)

  function shiftMonth(n: number) {
    const d = new Date(`${month}T00:00:00`)
    d.setMonth(d.getMonth() + n)
    setMonth(monthStart(d.toLocaleDateString("en-CA")))
  }

  // Event form state
  const [title, setTitle] = useState("")
  const [time, setTime] = useState("")
  const [remind, setRemind] = useState("-1")
  const [notes, setNotes] = useState("")

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    await eventsHook.create({
      title: clean,
      date: selected,
      time,
      notes,
      remind_days: Number(remind),
    })
    setTitle("")
    setTime("")
    setNotes("")
    setRemind("-1")
  }

  const selectedTasks = tasksOn(selected)
  const selectedEvents = eventsOn(selected).sort((a, b) => a.time.localeCompare(b.time))

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Task deadlines and your events in one place.</p>
      </header>

      <RemindersPanel reminders={reminders} />

      <Card className="gap-4 p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-sm font-medium">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => { setMonth(monthStart(today)); setSelected(today) }}>
              Today
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.slice(0, 7) === month.slice(0, 7)
            const dayTasks = tasksOn(day)
            const dayEvents = eventsOn(day)
            const count = dayTasks.length + dayEvents.length
            return (
              <button
                key={day}
                onClick={() => setSelected(day)}
                aria-label={`${day}${count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
                aria-pressed={selected === day}
                className={cn(
                  "flex min-h-14 flex-col items-start gap-1 rounded-md border p-1 text-left text-xs transition-colors",
                  selected === day ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                  !inMonth && "text-muted-foreground/50",
                )}
              >
                <span className={cn("font-medium", day === today && "text-primary")}>
                  {Number(day.slice(8))}
                </span>
                {count > 0 && (
                  <span className="flex flex-wrap gap-0.5">
                    {dayTasks.slice(0, 2).map((t) => (
                      <span key={t.id} className="size-1.5 rounded-full bg-primary" />
                    ))}
                    {dayEvents.slice(0, 2).map((e) => (
                      <span key={e.id} className="size-1.5 rounded-full bg-foreground" />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary align-middle" /> Task deadline ·{" "}
          <span className="inline-block size-1.5 rounded-full bg-foreground align-middle" /> Event
        </p>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="gap-3 p-4">
          <h2 className="text-sm font-medium">
            {new Date(`${selected}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </h2>

          {selectedTasks.length === 0 && selectedEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          )}

          {selectedTasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">Deadline · </span>
                {t.title}
              </span>
              <a
                href={googleCalendarUrl({ title: t.title, date: selected, details: t.notes })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Google Calendar <ExternalLink className="size-3" />
              </a>
            </div>
          ))}

          {selectedEvents.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  {e.time && <span className="text-muted-foreground">{e.time} · </span>}
                  {e.title}
                </p>
                {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={googleCalendarUrl({ title: e.title, date: e.date, time: e.time || undefined, details: e.notes })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  Google Calendar <ExternalLink className="size-3" />
                </a>
                <button
                  onClick={() => eventsHook.remove(e.id)}
                  aria-label={`Delete ${e.title}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>

        <Card className="gap-3 p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <CalendarPlus className="size-4" aria-hidden="true" /> Add an event
          </h2>
          <form onSubmit={addEvent} className="flex flex-col gap-2">
            <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Event title" />
            <div className="flex gap-2">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Event time" className="w-32" />
              <select
                aria-label="Event reminder"
                value={remind}
                onChange={(e) => setRemind(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="-1">No reminder</option>
                <option value="0">On the day</option>
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">1 week before</option>
              </select>
            </div>
            <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Event notes" />
            <Button type="submit" disabled={!title.trim()}>Add event on {selected}</Button>
          </form>
        </Card>
      </section>
    </main>
  )
}
