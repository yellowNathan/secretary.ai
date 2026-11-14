import { useMemo, useState } from "react"
import { useCollection } from "@omg-dev/sdk"
import { ArrowLeft, ArrowRight, BellRing, CalendarDays, Check, Columns3, Paperclip, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "@/lib/toast"
import { Skeleton } from "@/components/ui/skeleton"
import { RemindersPanel } from "@/components/reminders-panel"
import { Attachments } from "@/components/attachments"
import { ReminderPicker } from "@/components/reminder-picker"
import { dueMoment, formatDueFull, formatOffset, hms, remindSeconds } from "@/lib/reminders"
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

function isOverdue(task: Task, doneColumnIds: Set<string>) {
  if (!task.due || doneColumnIds.has(task.status)) return false
  return dueMoment(task.due, task.due_time) < Date.now()
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
  const [remind, setRemind] = useState(-1)
  const [dueTime, setDueTime] = useState("")
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
  const openCount = visible.filter((t) => !doneColumnIds.has(t.status)).length
  const overdueCount = visible.filter((t) => isOverdue(t, doneColumnIds)).length

  const selectedColumn = columnId && columnIds.has(columnId) ? columnId : columns[0]?.id ?? ""

  async function addColumn(e: React.FormEvent) {
    e.preventDefault()
    const name = newColumn.trim()
    if (!name) return
    const position = columns.length ? columns[columns.length - 1].position + 1 : 0
    try {
      await columnsHook.create({ name, position, done: false })
      setNewColumn("")
      toast.success(`Column “${name}” added`)
    } catch {
      toast.error("Couldn't add the column. Check your connection and try again.")
    }
  }

  async function deleteTask(task: Task) {
    try {
      await tasksHook.remove(task.id)
      toast.success(`Deleted “${task.title}”`)
    } catch {
      toast.error("Couldn't delete the task. Try again.")
    }
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean || !selectedColumn) return
    try {
      await tasksHook.create({
        title: clean,
        project: newProject.trim() || (project !== "All" ? project : "General"),
        status: selectedColumn,
        priority,
        due,
        notes: "",
        remind_days: -1,
        due_time: dueTime,
        remind_before: remind,
      })
      setTitle("")
      setDue("")
      setDueTime("")
      toast.success("Task added")
    } catch {
      toast.error("Couldn't save the task. Check your connection and try again.")
    }
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
    try {
      await columnsHook.remove(col.id)
      toast.success(`Column “${col.name}” deleted`)
    } catch {
      toast.error("Couldn't delete the column. Try again.")
    }
  }

  const loading = (columnsHook.loading || tasksHook.loading) && columns.length === 0 && tasks.length === 0
  const loadError = columnsHook.error || tasksHook.error

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">My work</h1>
          <p className="text-base text-muted-foreground">
            {openCount} open
            {overdueCount > 0 && <span className="font-medium text-destructive"> · {overdueCount} overdue</span>}
          </p>
        </header>

        <RemindersPanel tasks={tasks} events={eventsHook.data as CalendarEvent[]} doneColumnIds={doneColumnIds} />

        {columns.length > 0 && (
          <form onSubmit={addTask} aria-label="Add a task" className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="space-y-2">
              <label htmlFor="task-title" className="text-sm font-medium">New task</label>
              <div className="flex gap-2">
                <Input
                  id="task-title"
                  placeholder="What needs doing?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 flex-1 text-base"
                />
                <Button type="submit" disabled={!title.trim()} className="h-11 px-5">
                  <Plus className="size-4" aria-hidden="true" /> Add task
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Field label="Project" htmlFor="task-project">
                <Input
                  id="task-project"
                  placeholder={project !== "All" ? project : "General"}
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  list="project-options"
                  className="h-11"
                />
              </Field>
              <Field label="Column" htmlFor="task-column">
                <select id="task-column" value={selectedColumn} onChange={(e) => setColumnId(e.target.value)} className={selectClass}>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" htmlFor="task-priority">
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={selectClass}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {priority === "high" ? "Urgent alerts: sound, repeats" : priority === "medium" ? "Normal alerts: chime" : "Quiet alerts: no sound"}
                </p>
              </Field>
              <Field label="Due (date and time)" htmlFor="task-due" className="col-span-2">
                <Input
                  id="task-due"
                  type="datetime-local"
                  step={1}
                  value={due ? `${due}T${hms(dueTime)}` : ""}
                  onChange={(e) => {
                    const v = e.target.value
                    setDue(v.slice(0, 10))
                    setDueTime(v.length > 10 ? hms(v.slice(11)) : "")
                  }}
                  className="h-11"
                />
                {due && (
                  <p className="text-sm text-muted-foreground tabular-nums">Due {formatDueFull(due, dueTime)}</p>
                )}
              </Field>
              <Field label="Remind me" htmlFor="task-remind" className="col-span-2 sm:col-span-3 lg:col-span-1">
                <ReminderPicker id="task-remind" value={remind} onChange={setRemind} />
              </Field>
              {remind >= 0 && !due && (
                <p className="col-span-2 text-sm text-muted-foreground sm:col-span-3 lg:col-span-6">
                  Pick a due date so the reminder knows when to go off.
                </p>
              )}
            </div>
            <datalist id="project-options">
              {projects.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </form>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {projects.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by project">
              {["All", ...projects].map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={project === p}
                  onClick={() => setProject(p)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm transition-colors duration-150 active:scale-[0.98]",
                    project === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          <form onSubmit={addColumn} className="flex gap-2" aria-label="Add a column">
            <label htmlFor="new-column" className="sr-only">New column name</label>
            <Input
              id="new-column"
              placeholder="New column, e.g. To do"
              value={newColumn}
              onChange={(e) => setNewColumn(e.target.value)}
              className="h-11 flex-1 sm:w-56"
            />
            <Button type="submit" variant="outline" className="h-11" disabled={!newColumn.trim()}>
              <Columns3 className="size-4" aria-hidden="true" /> Add column
            </Button>
          </form>
        </div>

        {loadError ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive">
            Your board couldn't load. Check your connection, then refresh the page.
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-3" aria-label="Loading your board">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : columns.length === 0 && unsortedTasks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Columns3 className="size-6" aria-hidden="true" />
            </span>
            <p className="max-w-sm text-base text-muted-foreground">Make your first column, like “To do”, to start organising your work.</p>
            <Button className="h-11" onClick={() => document.getElementById("new-column")?.focus()}>
              <Plus className="size-4" aria-hidden="true" /> Create a column
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:gap-4 md:overflow-x-auto md:pb-2">
            {unsortedTasks.length > 0 && (
              <ColumnView
                title="Unsorted"
                openFilesId={openFilesId}
                onToggleFiles={(id) => setOpenFilesId((cur) => (cur === id ? null : id))}
                count={unsortedTasks.length}
                tasks={unsortedTasks.filter((t) => project === "All" || t.project === project)}
                doneColumnIds={doneColumnIds}
                onMove={moveTask}
                onDelete={deleteTask}
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
                onDelete={deleteTask}
                onRename={(name) => {
                  void columnsHook.update(col.id, { name })
                  toast.success("Column renamed")
                }}
                isDone={!!col.done}
                onToggleDone={() => {
                  void columnsHook.update(col.id, { done: !col.done })
                  toast.success(col.done ? `“${col.name}” is no longer a done column` : `“${col.name}” now counts as done`)
                }}
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

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

function Field({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const iconBtn =
  "inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"

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
    <section aria-label={title} className="flex w-full flex-col gap-3 rounded-xl bg-muted/40 p-3 md:w-80 md:shrink-0">
      <div className="flex items-center justify-between gap-1">
        {editing ? (
          <form onSubmit={saveName} className="flex flex-1 items-center gap-1">
            <label htmlFor={`rename-${title}`} className="sr-only">Column name</label>
            <Input id={`rename-${title}`} value={draft} onChange={(e) => setDraft(e.target.value)} className="h-11" autoFocus />
            <button type="submit" className={iconBtn} aria-label="Save name"><Check className="size-4" aria-hidden="true" /></button>
            <button type="button" className={iconBtn} aria-label="Cancel renaming" onClick={() => setEditing(false)}><X className="size-4" aria-hidden="true" /></button>
          </form>
        ) : (
          <>
            <h2 className="flex min-w-0 items-center gap-2 pl-1 text-lg font-semibold">
              <span className="truncate">{title}</span>
              <span className="rounded-full bg-background px-2 text-sm font-normal text-muted-foreground">{count}</span>
              {isDone && <span className="rounded-full bg-primary/10 px-2 text-xs font-medium text-primary">Done</span>}
            </h2>
            <div className="flex shrink-0 items-center">
              {onMoveLeft && (
                <button className={iconBtn} aria-label={`Move ${title} column left`} onClick={onMoveLeft}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
              )}
              {onMoveRight && (
                <button className={iconBtn} aria-label={`Move ${title} column right`} onClick={onMoveRight}>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              )}
              {onToggleDone && (
                <button
                  className={cn(iconBtn, isDone && "text-primary")}
                  aria-label={isDone ? `Unmark ${title} as done` : `Mark ${title} as done`}
                  aria-pressed={isDone}
                  onClick={onToggleDone}
                >
                  <Check className="size-4" aria-hidden="true" />
                </button>
              )}
              {onRename && (
                <button className={iconBtn} aria-label={`Rename ${title}`} onClick={() => { setDraft(title); setEditing(true) }}>
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
              )}
              {onDeleteColumn && (
                <button className={cn(iconBtn, "hover:text-destructive")} aria-label={`Delete ${title} column`} onClick={onDeleteColumn}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background/60 p-6 text-center">
          <Plus className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No tasks yet. Add one with the form above.</p>
        </div>
      )}
      {tasks.map((task) => {
        const done = doneColumnIds.has(task.status)
        const unsorted = title === "Unsorted"
        const overdue = isOverdue(task, doneColumnIds)
        return (
          <Card key={task.id} className="fade-in gap-3 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("pt-2 text-base font-medium leading-snug break-words", done && "text-muted-foreground line-through")}>
                {task.title}
              </p>
              <div className="-mr-2 -mt-1 flex shrink-0 items-center">
                <button
                  onClick={() => onToggleFiles?.(task.id)}
                  aria-label={`Files for ${task.title}`}
                  aria-pressed={openFilesId === task.id}
                  className={cn(iconBtn, openFilesId === task.id && "bg-primary/10 text-primary")}
                >
                  <Paperclip className="size-4" aria-hidden="true" />
                </button>
                <button onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} className={cn(iconBtn, "hover:text-destructive")}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {task.project && <Badge variant="outline">{task.project}</Badge>}
              <Badge variant="outline" className={cn("capitalize", priorityStyle[task.priority])}>
                {task.priority}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 text-muted-foreground",
                  overdue && "bg-destructive/10 font-medium text-destructive",
                  !overdue && task.due && !done && "bg-brand-accent/25 text-foreground",
                )}
              >
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <span className="tabular-nums">
                  {task.due ? formatDueFull(task.due, task.due_time) : "No due date"}
                </span>
                {overdue && <span>· Overdue</span>}
              </span>
              {task.due && remindSeconds(task) != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <BellRing className="size-3.5" aria-hidden="true" />
                  {formatOffset(remindSeconds(task))}
                </span>
              )}
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <Button variant="ghost" className="h-11" onClick={() => onMove(task, -1)} disabled={unsorted} aria-label={`Move ${task.title} back`}>
                <ArrowLeft className="size-4" aria-hidden="true" /> Back
              </Button>
              <Button variant="ghost" className="h-11" onClick={() => onMove(task, 1)} disabled={done} aria-label={`Move ${task.title} forward`}>
                Next <ArrowRight className="size-4" aria-hidden="true" />
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
