import { useMemo, useState, useSyncExternalStore } from "react"
import { Link } from "@tanstack/react-router"
import { useCollection, useUser } from "@omg-dev/sdk"
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Bot,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  KanbanSquare,
  ListTodo,
  Plus,
  Settings,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { RemindersPanel } from "@/components/reminders-panel"
import { addDays, dueMoment, formatDueFull, formatDuration, todayISO } from "@/lib/reminders"
import type { CalendarEvent, Column, ProfileDetails, Task } from "@/lib/tasks"
import { cn } from "@/lib/utils"
import { locale, useT } from "@/lib/i18n"

type Item = { id: string; kind: "task" | "event"; title: string; at: number; date: string; time: string; priority?: Task["priority"]; project?: string }

const DAY = 86_400_000

// Phones get their own layout; larger screens keep the wide dashboard.
// Only one is ever rendered, so reminders never ring twice.
const PHONE = "(max-width: 767px)"
function useIsPhone() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(PHONE)
      m.addEventListener("change", cb)
      return () => m.removeEventListener("change", cb)
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  )
}

// Everything the home summary shows, for whichever layout is on screen.
function useHomeData() {
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

  const lists = useMemo(() => {
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
    const todayItems = upcoming.filter((i) => i.date === today)
    return { overdue, upcoming, todayItems, openCount: open.length }
  }, [tasks, events, doneColumnIds, now, weekEnd, today])

  const name = profile?.first_name || profile?.display_name || String(user?.name || "").split(" ")[0] || ""
  const hour = new Date().getHours()
  const greeting = hour < 12 ? t("Good morning") : hour < 18 ? t("Good afternoon") : t("Good evening")
  const loading = tasksHook.loading || eventsHook.loading || columnsHook.loading

  return {
    ...lists,
    tasks,
    events,
    doneColumnIds,
    now,
    loading,
    title: name ? t("{greeting}, {name}", { greeting, name }) : greeting,
    dateLine: new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" }),
  }
}

type HomeData = ReturnType<typeof useHomeData>

// "/" for signed-in people: what's overdue, today and in the next 7 days.
export function HomeSummary() {
  const data = useHomeData()
  return useIsPhone() ? <PhoneHome d={data} /> : <WideHome d={data} />
}

// ── Phone ────────────────────────────────────────────────────────────────────

type View = "overdue" | "today" | "week"

function PhoneHome({ d }: { d: HomeData }) {
  const t = useT()
  const [picked, setPicked] = useState<View | null>(null)
  // Until the person picks, open on whatever needs attention most.
  const view: View = picked ?? (d.overdue.length ? "overdue" : d.todayItems.length ? "today" : "week")
  const list = view === "overdue" ? d.overdue : view === "today" ? d.todayItems : d.upcoming
  const next = d.overdue[0] ?? d.upcoming[0]

  const tiles: { id: View; label: string; value: number; tone?: string }[] = [
    { id: "overdue", label: t("Overdue"), value: d.overdue.length, tone: d.overdue.length ? "text-destructive" : undefined },
    { id: "today", label: t("Today"), value: d.todayItems.length },
    { id: "week", label: t("This week"), value: d.upcoming.length },
  ]
  const empty = view === "overdue" ? t("You're all caught up.") : view === "today" ? t("Nothing due today.") : t("Nothing due in the next 7 days.")

  return (
    <main className="flex w-full flex-col gap-5 px-4 pt-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{d.title}</h1>
        <p className="text-base text-muted-foreground">
          {d.dateLine}{!d.loading && ` · ${t("{n} open", { n: d.openCount })}`} 
        </p>
      </header>

      <section aria-labelledby="next-up">
        <h2 id="next-up" className="sr-only">{t("Next up")}</h2>
        {d.loading ? (
          <Skeleton className="h-28 w-full" />
        ) : next ? (
          <NextUp item={next} now={d.now} />
        ) : (
          <Card className="flex-row items-center gap-3 p-4">
            <CheckCircle2 className="size-6 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-base text-muted-foreground">{t("Nothing coming up. Enjoy the calm.")}</p>
          </Card>
        )}
      </section>

      <section aria-labelledby="summary-list" className="flex flex-col gap-3">
        <h2 id="summary-list" className="sr-only">{t("Summary")}</h2>
        <ToggleGroup
          aria-label={t("Summary")}
          variant="outline"
          spacing={2}
          className="grid w-full grid-cols-3"
          value={[view]}
          onValueChange={(v: unknown[]) => v[0] && setPicked(v[0] as View)}
        >
          {tiles.map((tile) => (
            <ToggleGroupItem
              key={tile.id}
              value={tile.id}
              className="h-auto min-h-16 w-full flex-col gap-0 py-2 data-[pressed]:border-primary data-[pressed]:bg-primary/10"
            >
              {d.loading ? (
                <Skeleton className="h-7 w-6" />
              ) : (
                <span className={cn("text-2xl font-semibold tabular-nums", tile.tone)}>{tile.value}</span>
              )}
              <span className="text-sm font-normal text-muted-foreground">{tile.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {d.loading ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : list.length === 0 ? (
          <Card className="items-center gap-2 p-5 text-center">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            <p className="text-base text-muted-foreground">{empty}</p>
          </Card>
        ) : (
          <ul className="fade-in flex flex-col gap-2" key={view}>
            {list.map((i) => <ItemRow key={`${i.kind}-${i.id}`} item={i} now={d.now} />)}
          </ul>
        )}
      </section>

      <RemindersPanel tasks={d.tasks} events={d.events} doneColumnIds={d.doneColumnIds} />

      <nav aria-label={t("Shortcuts")} className="grid grid-cols-2 gap-2">
        <Tile to="/board" icon={KanbanSquare} label={t("Board")} />
        <Tile to="/calendar" icon={CalendarPlus} label={t("Calendar")} />
        <Tile to="/chat" icon={Bot} label={t("Your secretary")} />
        <Tile to="/settings" icon={Settings} label={t("Settings")} />
      </nav>

      {/* The one main action, always within thumb reach. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/board" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
          <Plus className="size-5" aria-hidden="true" /> {t("Add task")}
        </Link>
      </div>
    </main>
  )
}

function NextUp({ item, now }: { item: Item; now: number }) {
  const t = useT()
  const late = item.at < now
  const left = item.at - now
  const countdown = late
    ? t("Overdue by {d}", { d: formatDuration(-left) })
    : t(item.kind === "event" ? "Starts in {d}" : "Due in {d}", { d: formatDuration(left) })
  const edge =
    late || item.priority === "high" ? "border-l-destructive" : item.priority === "low" ? "border-l-border" : "border-l-primary"

  return (
    <Link
      to={item.kind === "event" ? "/calendar" : "/board"}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className={cn("gap-2 border-l-4 p-4 transition-colors duration-150 group-hover:bg-accent group-active:bg-accent motion-reduce:transition-none", edge)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{t("Next up")}</span>
          {item.priority && <PriorityBadge priority={item.priority} />}
        </div>
        <p className="text-xl font-semibold leading-snug">{item.title}</p>
        <p className={cn("flex items-center gap-1.5 text-base tabular-nums", late ? "font-medium text-destructive" : "text-foreground")}>
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {countdown}
        </p>
        <p className="text-sm text-muted-foreground">
          {whenLabel(item, t)}
          {item.time ? ` · ${item.time.slice(0, 5)}` : ""}
          {item.kind === "event" ? ` · ${t("Event")}` : item.project ? ` · ${item.project}` : ""}
        </p>
      </Card>
    </Link>
  )
}

function Tile({ to, icon: Icon, label }: { to: "/board" | "/calendar" | "/chat" | "/settings"; icon: typeof KanbanSquare; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-4 text-base font-medium transition-colors duration-150 hover:bg-accent active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 break-words py-2 leading-tight">{label}</span>
    </Link>
  )
}

// ── Tablet and desktop ───────────────────────────────────────────────────────

function WideHome({ d }: { d: HomeData }) {
  const t = useT()
  const stats = [
    { label: t("Open tasks"), value: d.openCount, icon: ListTodo, tone: "" },
    { label: t("Overdue"), value: d.overdue.length, icon: AlertTriangle, tone: d.overdue.length ? "text-destructive" : "" },
    { label: t("Today"), value: d.todayItems.length, icon: Clock, tone: "" },
    { label: t("Next 7 days"), value: d.upcoming.length, icon: CalendarDays, tone: "" },
  ]

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
          <p className="text-base text-muted-foreground">
            {d.dateLine} · {t("Here's what's coming up.")}
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
            {d.loading ? <Skeleton className="h-8 w-10" /> : <p className={cn("text-3xl font-semibold tabular-nums", s.tone)}>{s.value}</p>}
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </section>

      <RemindersPanel tasks={d.tasks} events={d.events} doneColumnIds={d.doneColumnIds} />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-labelledby="coming-up">
          <h2 id="coming-up" className="text-xl font-semibold">{t("Coming up this week")}</h2>
          {d.loading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : d.upcoming.length === 0 ? (
            <Card className="items-center gap-2 p-6 text-center">
              <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
              <p className="text-base text-muted-foreground">{t("Nothing due in the next 7 days.")}</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.upcoming.slice(0, 8).map((i) => <ItemRow key={`${i.kind}-${i.id}`} item={i} now={d.now} />)}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="overdue">
          <h2 id="overdue" className="text-xl font-semibold">{t("Overdue")}</h2>
          {d.overdue.length === 0 ? (
            <Card className="items-center gap-2 p-6 text-center">
              <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
              <p className="text-base text-muted-foreground">{t("You're all caught up.")}</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.overdue.slice(0, 8).map((i) => <ItemRow key={i.id} item={i} now={d.now} />)}
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

// ── Shared pieces ────────────────────────────────────────────────────────────

function whenLabel(item: Item, t: (k: string) => string): string {
  const days = Math.round((dueMoment(item.date, "00:00") - dueMoment(todayISO(), "00:00")) / DAY)
  return days === 0 ? t("Today") : days === 1 ? t("Tomorrow") : formatDueFull(item.date, item.time).split(" · ")[0]
}

function PriorityBadge({ priority }: { priority: NonNullable<Task["priority"]> }) {
  const t = useT()
  return (
    <Badge variant="outline" className={cn(priority === "high" && "border-destructive/30 text-destructive")}>
      {t(priority === "high" ? "High" : priority === "low" ? "Low" : "Medium")}
    </Badge>
  )
}

function ItemRow({ item, now }: { item: Item; now: number }) {
  const t = useT()
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
            {whenLabel(item, t)}
            {item.time ? ` · ${item.time.slice(0, 5)}` : ""}
            {item.kind === "event" ? ` · ${t("Event")}` : item.project ? ` · ${item.project}` : ""}
          </p>
        </div>
        {item.priority && <PriorityBadge priority={item.priority} />}
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
