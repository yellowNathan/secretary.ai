import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Column, Priority, Task } from "@/lib/tasks"

export const Route = createFileRoute("/demo")({ component: Demo })

// "/demo" — a short walkthrough that loads sample work, then opens the board.

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
const samples: { title: string; project: string; col: number; priority: Priority; due: string }[] = [
  { title: "Draft Q3 report", project: "Finance", col: 1, priority: "high", due: daysFromNow(2) },
  { title: "Review vendor invoices", project: "Finance", col: 0, priority: "medium", due: daysFromNow(-1) },
  { title: "Plan product launch", project: "Marketing", col: 0, priority: "high", due: daysFromNow(7) },
  { title: "Write launch email", project: "Marketing", col: 0, priority: "low", due: daysFromNow(10) },
  { title: "Book team offsite", project: "Operations", col: 2, priority: "low", due: daysFromNow(-3) },
  { title: "Update onboarding doc", project: "Operations", col: 1, priority: "medium", due: daysFromNow(4) },
]

const steps = [
  { title: "Make your columns", text: "Name the stages your work goes through, like Backlog, In progress and Done." },
  { title: "Add tasks", text: "Type a task, pick a column, set a priority and an optional due date." },
  { title: "Move work along", text: "Use the arrows on a task to move it to the next or previous column." },
  { title: "Filter by project", text: "Tap a project chip to see only that project's work." },
]

function Demo() {
  const navigate = useNavigate()
  const tasksHook = useCollection<Task>({ collection: "tasks", api: "/api/tasks" })
  const columnsHook = useCollection<Column>({ collection: "columns", api: "/api/columns" })
  const [loading, setLoading] = useState(false)

  async function loadDemo() {
    setLoading(true)
    const cols = [...(columnsHook.data as Column[])].sort((a, b) => a.position - b.position)
    if (cols.length === 0) {
      for (const [i, c] of sampleColumns.entries()) {
        cols.push(await columnsHook.create({ name: c.name, position: i, done: c.done }))
      }
    }
    for (const s of samples) {
      const col = cols[Math.min(s.col, cols.length - 1)]
      await tasksHook.create({
        title: s.title,
        project: s.project,
        status: col.id,
        priority: s.priority,
        due: s.due,
        notes: "",
      })
    }
    setLoading(false)
    navigate({ to: "/board" })
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">See how it works</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Load a sample board with realistic work, then try each step yourself.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className="flex-row items-start gap-4 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {i + 1}
              </span>
              <div>
                <h2 className="text-sm font-medium">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="gap-3 p-5">
        <h2 className="text-sm font-medium">Ready?</h2>
        <p className="text-sm text-muted-foreground">
          This adds six example tasks across Finance, Marketing and Operations. If you have no columns yet, it
          also adds Backlog, In progress and Done, then opens the board.
        </p>
        <div>
          <Button size="lg" onClick={loadDemo} disabled={loading}>
            {loading ? "Loading demo…" : "Load the demo board"}
          </Button>
        </div>
      </Card>
    </main>
  )
}
