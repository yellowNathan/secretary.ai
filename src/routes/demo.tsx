import { useCallback, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ChevronDown, Info, RotateCcw, UserPlus } from "lucide-react"
import { Board } from "@/App"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DemoAssistant } from "@/components/demo-assistant"
import type { Column, Priority, Task } from "@/lib/tasks"
import { newId, useLocalCollection } from "@/lib/local-store"
import { t, useT } from "@/lib/i18n"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/demo")({ component: Demo })

// "/demo" — a practice board anyone can use without an account. Everything
// stays in this browser. The signed-in demo AI sends a snapshot only when asked.

function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const sampleColumns = [
  { name: "Backlog", done: false },
  { name: "In progress", done: false },
  { name: "Done", done: true },
]

// `col` is an index into sampleColumns.
const samples: { title: string; project: string; col: number; priority: Priority; due: number; time: string; remind: number }[] = [
  { title: "Draft Q3 report", project: "Finance", col: 1, priority: "high", due: 2, time: "17:00:00", remind: 3600 },
  { title: "Review vendor invoices", project: "Finance", col: 0, priority: "medium", due: -1, time: "12:00:00", remind: -1 },
  { title: "Plan product launch", project: "Marketing", col: 0, priority: "high", due: 7, time: "10:00:00", remind: 86400 },
  { title: "Write launch email", project: "Marketing", col: 0, priority: "low", due: 10, time: "09:00:00", remind: -1 },
  { title: "Book team offsite", project: "Operations", col: 2, priority: "low", due: -3, time: "15:30:00", remind: -1 },
  { title: "Update onboarding doc", project: "Operations", col: 1, priority: "medium", due: 4, time: "11:00:00", remind: 1800 },
]

// Fixed ids so the sample tasks land in the right sample columns.
const colIds = ["demo-col-0", "demo-col-1", "demo-col-2"]

const steps = [
  { title: "Make your columns", text: "Name the stages your work goes through, like Backlog, In progress and Done." },
  { title: "Add tasks", text: "Type a task, pick a column, set a priority and an optional due date." },
  { title: "Move work along", text: "Use the arrows on a task to move it to the next or previous column." },
  { title: "Filter by project", text: "Tap a project chip to see only that project's work." },
]

function Demo() {
  const tr = useT()
  const [demoVersion, setDemoVersion] = useState(0)
  const seedColumns = useCallback(
    () => sampleColumns.map((c, i) => ({ id: colIds[i], name: t(c.name), position: i, done: c.done }) as Column),
    [],
  )
  const seedTasks = useCallback(
    () =>
      samples.map(
        (s) =>
          ({
            id: newId(),
            title: t(s.title),
            project: t(s.project),
            status: colIds[s.col],
            priority: s.priority,
            due: daysFromNow(s.due),
            due_time: s.time,
            remind_before: s.remind,
            remind_days: -1,
            notes: "",
          }) as Task,
      ),
    [],
  )
  const columnsHook = useLocalCollection<Column>("demo:columns", seedColumns)
  const tasksHook = useLocalCollection<Task>("demo:tasks", seedTasks)

  function startOver() {
    columnsHook.reset()
    tasksHook.reset()
    setDemoVersion((version) => version + 1)
    toast.success(tr("Demo board reset"))
  }

  return (
    <div>
      <section className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
        <Card className="gap-4 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">{tr("You're trying the demo")}</h1>
              <p className="text-base text-muted-foreground">
                {tr("No account needed. Changes stay on this device only. Sign up to save your work everywhere.")}
              </p>
            </div>
          </div>
          <details className="group rounded-lg">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-1 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {tr("How it works")}
              <ChevronDown className="size-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
          <ol className="mt-2 grid gap-2 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <div>
                  <h2 className="text-sm font-medium">{tr(s.title)}</h2>
                  <p className="text-sm text-muted-foreground">{tr(s.text)}</p>
                </div>
              </li>
            ))}
          </ol>
          </details>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/signup">
              <Button className="h-11 w-full sm:w-auto">
                <UserPlus className="size-4" aria-hidden="true" /> {tr("Sign up to save your work")}
              </Button>
            </Link>
            <Button variant="outline" className="h-11" onClick={startOver}>
              <RotateCcw className="size-4" aria-hidden="true" /> {tr("Start over")}
            </Button>
          </div>
        </Card>
        <div className="mt-4"><DemoAssistant key={demoVersion} columns={columnsHook} tasks={tasksHook} /></div>
      </section>
      <Board demo columnsHook={columnsHook} tasksHook={tasksHook} events={[]} />
    </div>
  )
}
