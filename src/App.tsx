import { useMemo, useState } from "react"
import { useCollection } from "@omg-dev/sdk"
import { ArrowLeft, ArrowRight, CalendarDays, Check, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react"
import { RemindersPanel } from "@/components/reminders-panel"
import { Attachments } from "@/components/attachments"
import { buildReminders, todayISO } from "@/lib/reminders"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CalendarEvent, Column, Priority, Task } from "@/lib/tasks"

const priorityStyle: Record<Priority, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-primary/10 text-primary border-primary/20",
  low: "bg-muted text-muted-foreground border-border",
}

function formatDue(due: string) {
  if (!due) return "No date"
  const d = new Date(due.length === 10 ? `${due}T00:00:00` : due)
  if (Number.isNaN(d.getTime())) return due
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

function isOverdue(task: Task, doneColumnIds: Set<string>) {
  if (!task.due || doneColumnIds.has(task.status)) return false
  const today = new Date().toISOString().slice(0, 10)
  return task.due < today
}

function App() {
  const columnsHook = useCollection<Column>({ collection: "columns", api: "/api/columns" })
  const tasksHook = useCollection<Task>({ collection: "tasks", api: "/api/tasks" })
  const columns = useMemo(
    () => [...(columnsHook.data as Column[])].sort((a, b) => a.position - b.position),
    [columnsHook.data],
  )
  const tasks = tasksHook.data as Task[]
  const eventsHook = useCollection<CalendarEvent>({ collection: "events", api: "/api/events" })

  const [project, setProject] = useState<string>("All")
  const [title, setTitle] = useState("")
  const [newProject, setNewProject] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [due, setDue] = useState("")
  const [columnId, setColumnId] = useState<string>("")
  const [newColumn, setNewColumn] = useState("")
  const [remind, setRemind] = useState("-1")
  const [openFilesId, setOpenFilesId] = useState<string | null>(null)

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns])
  // Tasks whose column was deleted (or was never set) have no home yet.
  const unsortedTasks = tasks.filter((t) => !columnIds.has(t.status))
  const projects = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.project).filter(Boolean))).sort(),
    [tasks],
  )
  const visible = useMemo(
    () => (project === "All" ? tasks : tasks.filter((t) => t.project === project)),
    [tasks, project],
  )
  // Columns the user marked as "done" count as finished for open and overdue.
  const doneColumnIds = useMemo(
    () => new Set(columns.filter((c) => c.done).map((c) => c.id)),
    [columns],
  )
  const reminders = useMemo(
    () => buildReminders(tasks, eventsHook.data as CalendarEvent[], doneColumnIds, todayISO()),
    [tasks, eventsHook.data, doneColumnIds],
  )
  const openCount = visible.filter((t) => !doneColumnIds.has(t.status)).length
  const overdueCount = visible.filter((t) => isOverdue(t, doneColumnIds)).length

  const selectedColumn = columnId && columnIds.has(columnId) ? columnId : columns[0]?.id ?? ""

  async function addColumn(e: React.FormEvent) {
    e.preventDefault()
    const name = newColumn.trim()
    if (!name) return
    const position = columns.length ? columns[columns.length - 1].position + 1 : 0
    await columnsHook.create({ name, position, done: false })
    setNewColumn("")
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || !selectedColumn) return
    await tasksHook.create({
      title: clean,
      project: newProject.trim() || (project !== "All" ? project : "General"),
      status: selectedColumn,
      priority,
      due,
      notes: "",
      remind_days: Number(remind),
    })
    setTitle("")
    setDue("")
  }

  function moveTask(task: Task, dir: -1 | 1) {
    if (!columnIds.has(task.status)) {
      if (columns[0]) void tasksHook.update(task.id, { status: columns[0].id })
      return
    }
    const i = columns.findIndex((c) => c.id === task.status)
    const next = columns[i + dir]
    if (next) void tasksHook.update(task.id, { status: next.id })
  }

  async function swapColumns(index: number, dir: -1 | 1) {
    const a = columns[index]
    const b = columns[index + dir]
    if (!a || !b) return
    await Promise.all([
      columnsHook.update(a.id, { position: b.position }),
      columnsHook.update(b.id, { position: a.position }),
    ])
  }

  async function removeColumn(col: Column) {
    const count = tasks.filter((t) => t.status === col.id).length
    const msg = count
      ? `Delete "${col.name}"? Its ${count} task${count === 1 ? "" : "s"} will move to Unsorted.`
      : `Delete "${col.name}"?`
    if (!window.confirm(msg)) return
    await columnsHook.remove(col.id)
  }

  const loading = (columnsHook.loading || tasksHook.loading) && columns.length === 0 && tasks.length === 0

  return (
    <main className="min-h-svh bg-background text-foreground px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My work</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {openCount} open
              {overdueCount > 0 && <span className="text-destructive"> · {overdueCount} overdue</span>}
            </p>
          </div>
          <form onSubmit={addColumn} className="flex gap-2">
            <Input
              placeholder="New column"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              aria-label="New column name"
              className="w-44"
            />
            <Button type="submit" variant="secondary" disabled={!newColumn.trim()}>
              <Plus className="size-4" /> Column
            </Button>
          </form>
        </header>

        <RemindersPanel reminders={reminders} />

        {columns.length > 0 && (
          <form
            onSubmit={addTask}
            className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <Input
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Task title"
            />
            <Input
              placeholder={project !== "All" ? project : "Project"}
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              aria-label="Project"
              list="project-options"
              className="sm:w-36"
            />
            <div className="flex gap-2">
              <select
                aria-label="Column"
                value={selectedColumn}
                onChange={(e) => setColumnId(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                aria-label="Remind me"
                value={remind}
                onChange={(e) => setRemind(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="-1">No reminder</option>
                <option value="0">On the day</option>
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="7">1 week before</option>
              </select>
              <Input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                aria-label="Due date"
                className="w-36"
              />
              <Button type="submit" disabled={!title.trim()} className="flex-1">
                <Plus className="size-4" /> Add
              </Button>
            </div>
            <datalist id="project-options">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </form>
        )}

        {projects.length > 0 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Projects">
            {["All", ...projects].map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={project === p}
                onClick={() => setProject(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  project === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : columns.length === 0 && unsortedTasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Create your first column above, for example “To do”, to start organising your work.
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {unsortedTasks.length > 0 && (
              <ColumnView
                title="Unsorted"
                openFilesId={openFilesId}
                onToggleFiles={(id) => setOpenFilesId((cur) => (cur === id ? null : id))}
                count={unsortedTasks.length}
                tasks={unsortedTasks.filter((t) => project === "All" || t.project === project)}
                doneColumnIds={doneColumnIds}
                onMove={moveTask}
                onDelete={(t) => tasksHook.remove(t.id)}
              />
            )}
            {columns.map((col, index) => (
              <ColumnView
                key={col.id}
                title={col.name}
                openFilesId={openFilesId}
                onToggleFiles={(id) => setOpenFilesId((cur) => (cur === id ? null : id))}
                count={visible.filter((t) => t.status === col.id).length}
                tasks={visible.filter((t) => t.status === col.id)}
                doneColumnIds={doneColumnIds}
                onMove={moveTask}
                onDelete={(t) => tasksHook.remove(t.id)}
                onRename={(name) => columnsHook.update(col.id, { name })}
                isDone={!!col.done}
                onToggleDone={() => columnsHook.update(col.id, { done: !col.done })}
                onMoveLeft={index > 0 ? () => swapColumns(index, -1) : undefined}
                onMoveRight={index < columns.length - 1 ? () => swapColumns(index, 1) : undefined}
                onDeleteColumn={() => removeColumn(col)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function ColumnView({
  title,
  count,
  tasks,
  doneColumnIds,
  onMove,
  onDelete,
  onRename,
  onMoveLeft,
  onMoveRight,
  onDeleteColumn,
  isDone,
  onToggleDone,
  openFilesId,
  onToggleFiles,
}: {
  title: string
  count: number
  tasks: Task[]
  doneColumnIds: Set<string>
  onMove: (task: Task, dir: -1 | 1) => void
  onDelete: (task: Task) => void
  onRename?: (name: string) => void
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onDeleteColumn?: () => void
  isDone?: boolean
  onToggleDone?: () => void
  openFilesId?: string | null
  onToggleFiles?: (taskId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  function saveName(e: React.FormEvent) {
    e.preventDefault()
    const name = draft.trim()
    if (name && name !== title) onRename?.(name)
    setEditing(false)
  }

  return (
    <section className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-1 px-1">
        {editing ? (
          <form onSubmit={saveName} className="flex flex-1 gap-1">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Column name" className="h-8" autoFocus />
            <Button type="submit" variant="ghost" size="icon" aria-label="Save name"><Check className="size-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={() => setEditing(false)}><X className="size-4" /></Button>
          </form>
        ) : (
          <>
            <h2 className="truncate text-sm font-medium">
              {title} <span className="ml-1 text-xs font-normal text-muted-foreground">{count}</span>
            </h2>
            <div className="flex shrink-0 items-center">
              {onMoveLeft && (
                <Button variant="ghost" size="icon" aria-label={`Move ${title} left`} onClick={onMoveLeft}>
                  <ArrowLeft className="size-3.5" />
                </Button>
              )}
              {onMoveRight && (
                <Button variant="ghost" size="icon" aria-label={`Move ${title} right`} onClick={onMoveRight}>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
              {onToggleDone && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={isDone ? `Unmark ${title} as done` : `Mark ${title} as done`}
                  aria-pressed={isDone}
                  onClick={onToggleDone}
                  className={cn(isDone && "text-primary")}
                >
                  <Check className="size-3.5" />
                </Button>
              )}
              {onRename && (
                <Button variant="ghost" size="icon" aria-label={`Rename ${title}`} onClick={() => { setDraft(title); setEditing(true) }}>
                  <Pencil className="size-3.5" />
                </Button>
              )}
              {onDeleteColumn && (
                <Button variant="ghost" size="icon" aria-label={`Delete ${title}`} onClick={onDeleteColumn}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {tasks.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Nothing here
        </p>
      )}
      {tasks.map((task) => {
        const isDone = doneColumnIds.has(task.status)
        const unsorted = title === "Unsorted"
        return (
          <Card key={task.id} className="gap-3 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("text-sm font-medium leading-snug break-words", isDone && "line-through text-muted-foreground")}>
                {task.title}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onToggleFiles?.(task.id)}
                  aria-label={`Files for ${task.title}`}
                  aria-pressed={openFilesId === task.id}
                  className={cn("text-muted-foreground hover:text-foreground", openFilesId === task.id && "text-primary")}
                >
                  <Paperclip className="size-4" />
                </button>
              <button
                onClick={() => onDelete(task)}
                aria-label={`Delete ${task.title}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {task.project && <Badge variant="outline">{task.project}</Badge>}
              <Badge variant="outline" className={priorityStyle[task.priority]}>
                {task.priority}
              </Badge>
              <span className={cn("inline-flex items-center gap-1 text-muted-foreground", isOverdue(task, doneColumnIds) && "font-medium text-destructive")}>
                <CalendarDays className="size-3.5" />
                {formatDue(task.due)}
              </span>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => onMove(task, -1)} disabled={unsorted} aria-label="Move back">
                <ArrowLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onMove(task, 1)} aria-label="Move forward" disabled={isDone}>
                <ArrowRight className="size-4" />
              </Button>
            </div>
            {openFilesId === task.id && <Attachments taskId={task.id} />}
          </Card>
        )
      })}
    </section>
  )
}

export default App
