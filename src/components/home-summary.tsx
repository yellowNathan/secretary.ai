import { useMemo } from "react"
import { Link } from "@tanstack/react-router"
import { useCollection, useUser } from "@omg-dev/sdk"
import { AlertTriangle, ArrowRight, BellRing, CalendarDays, CalendarPlus, CheckCircle2, Clock, KanbanSquare, ListTodo, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RemindersPanel } from "@/components/reminders-panel"
import { addDays, dueMoment, formatDueFull, todayISO } from "@/lib/reminders"
import type { CalendarEvent, Column, ProfileDetails, Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Item = { id: string; kind: "task" | "event"; title: string; at: number; date: string; time: string; priority?: Task["priority"]; project?: string }

const DAY = 86_400_000

// "/" for signed-in people: what's overdue, today and in the next 7 days.
export function HomeSummary() {
  const t = useT()
  const user = useUser()
  const tasksHook = useCollection<Task>({ collection: "tasks", api: "/api/tasks" })
  const columnsHook = useCollection<Column>({ collection: "columns", api: "/api/columns" })
  const eventsHook = useCollection<CalendarEvent>({ collection: "events", api: "/api/events" })
  const profilesHook = useCollection<ProfileDetails>({ collection: "profiles", api: "/api/profiles" })

  const tasks = tasksHook.data as Task[]
  const events = eventsHook.data as CalendarEvent[]
  const profile = (profilesHook.data as ProfileDetails[])[0]
  const doneColumnIds = useMemo(
    () => new Set((columnsHook.data as Column[]).filter((c) => c.done).map((c) => c.id)),
    [columnsHook.data],
  )

  const now = Date.now()
  const today = todayISO()
  const weekEnd = dueMoment(addDays(today, 7), "23:59:59")

  const { overdue, upcoming, openCount, todayCount } = useMemo(() => {
    const open = tasks.filter((x) => !doneColumnIds.has(x.status))
    const items: Item[] = []
    for (const x of open) {
      if (!x.due) continue
      items.push({ id: x.id, kind: "task", title: x.title, at: dueMoment(x.due, x.due_time), date: x.due, time: x.due_time || "", priority: x.priority, project: x.project })
    }
    for (const e of events) {
      if (!e.date) continue
      items.push({ id: e.id, kind: "event", title: e.title, at: dueMoment(e.date, e.time || "00:00"), date: e.date, time: e.time || "" })
    }
    items.sort((a, b) => a.at - b.at)
    const overdue = items.filter((i) => i.kind === "task" && i.at < now)
    const upcoming = items.filter((i) => i.at >= now && i.at <= weekEnd)
    const todayCount = items.filter((i) => i.date === today && i.at >= now).length
    return { overdue, upcoming, openCount: open.length, todayCount }
  }, [tasks, events, doneColumnIds, now, weekEnd, today])

  const name = profile?.first_name || profile?.display_name || String(user?.name || "").split(" ")[0] || ""
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const loading = (tasksHook.loading || eventsHook.loading) && tasks.length === 0 && events.length === 0

  const stats = [
    { label: t("Open tasks"), value: openCount, icon: ListTodo, tone: "" },
    { label: t("Overdue"), value: overdue.length, icon: AlertTriangle, tone: overdue.length ? "text-destructive" : "" },
    { label: t("Today"), value: todayCount, icon: Clock, tone: "" },
    { label: t("Next 7 days"), value: upcoming.length, icon: CalendarDays, tone: "" },
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {name ? `${greeting}, ${name}` : greeting}
          </h1>
          <p className="text-base text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} · {t("Here's what's coming up.")}
          </p>
        </div>
        <Link to="/board">
          <Button className="h-11 w-full sm:w-auto">
            <Plus className="size-4" aria-hidden="true" /> {t("Add task")}
          </Button>
        </Link>
      </header>

      <section aria-label={t("Summary")} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 p-4">
            <s.icon className={cn("size-5 text-muted-foreground", s.tone)} aria-hidden="true" />
            {loading ? <Skeleton className="h-8 w-10" /> : <p className={cn("text-3xl font-semibold tabular-nums", s.tone)}>{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </section>

      <RemindersPanel tasks={tasks} events={events} doneColumnIds={doneColumnIds} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="coming-up">
          <h2 id="coming-up" className="text-xl font-semibold">{t("Coming up this week")}</h2>
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : upcoming.length === 0 ? (
            <Card className="items-center gap-2 p-6 text-center">
              <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
              <p className="text-base text-muted-foreground">{t("Nothing due in the next 7 days.")}</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.slice(0, 8).map((i) => <ItemRow key={`${i.kind}-${i.id}`} item={i} now={now} />)}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="overdue">
          <h2 id="overdue" className="text-xl font-semibold">{t("Overdue")}</h2>
          {overdue.length === 0 ? (
            <Card className="items-center gap-2 p-6 text-center">
              <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
              <p className="text-base text-muted-foreground">{t("You're all caught up.")}</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {overdue.slice(0, 8).map((i) => <ItemRow key={i.id} item={i} now={now} />)}
            </ul>
          )}
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2" aria-label={t("Shortcuts")}>
        <Shortcut to="/board" icon={KanbanSquare} title={t("Board")} text={t("Add tasks and set reminders")} />
        <Shortcut to="/calendar" icon={CalendarPlus} title={t("Calendar")} text={t("See and add events")} />
      </section>
    </main>
  )
}

function ItemRow({ item, now }: { item: Item; now: number }) {
  const t = useT()
  const days = Math.round((dueMoment(item.date, "00:00") - dueMoment(todayISO(), "00:00")) / DAY)
  const when = days === 0 ? t("Today") : days === 1 ? t("Tomorrow") : formatDueFull(item.date, item.time).split(" · ")[0]
  const late = item.at < now
  return (
    <li>
      <Card className={cn("flex-row items-center gap-3 p-3", late && "border-destructive/40")}>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            item.kind === "task" ? "bg-primary/10 text-primary" : "bg-brand-accent/15 text-foreground",
          )}
        >
          {item.kind === "task" ? <BellRing className="size-5" aria-hidden="true" /> : <CalendarDays className="size-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{item.title}</p>
          <p className={cn("text-sm tabular-nums text-muted-foreground", late && "text-destructive")}>
            {when}
            {item.time ? ` · ${item.time.slice(0, 5)}` : ""}
            {item.kind === "event" ? ` · ${t("Event")}` : item.project ? ` · ${item.project}` : ""}
          </p>
        </div>
        {item.priority && (
          <Badge variant="outline" className={cn(item.priority === "high" && "border-destructive/30 text-destructive")}>
            {t(item.priority === "high" ? "High" : item.priority === "low" ? "Low" : "Medium")}
          </Badge>
        )}
      </Card>
    </li>
  )
}

function Shortcut({ to, icon: Icon, title, text }: { to: "/board" | "/calendar"; icon: typeof KanbanSquare; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex-row items-center gap-3 p-4 transition-colors duration-150 group-hover:bg-accent motion-reduce:transition-none">
        <Icon className="size-6 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-base font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
        <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Card>
    </Link>
  )
}
