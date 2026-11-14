import { useCallback } from "react"
import { useCollection, useUpload } from "@omg-dev/sdk"
import type { Attachment, Automation, Column, Task } from "@/lib/tasks"
import { convertFile } from "@/lib/convert"
import { addDays, todayISO } from "@/lib/reminders"
import { fileMatches, notify, paramsOf, scheduleDue, taskMatches } from "@/lib/automations"

type NewTask = Omit<Task, "id">

export type FileRunResult = { rule: Automation; output?: File; error?: string }

// Shared engine used by the board, files, chat and the background runner.
export function useAutomationEngine() {
  const autos = useCollection<Automation>({ collection: "automations", api: "/api/automations" })
  const tasksHook = useCollection<Task>({ collection: "tasks", api: "/api/tasks" })
  const columnsHook = useCollection<Column>({ collection: "columns", api: "/api/columns" })
  const rules = autos.data as Automation[]

  const firstOpenColumn = useCallback(() => {
    const cols = [...(columnsHook.data as Column[])].sort((a, b) => a.position - b.position)
    return cols.find((c) => !c.done)?.id ?? cols[0]?.id ?? ""
  }, [columnsHook.data])

  const bump = useCallback(
    (rule: Automation, extra: Partial<Automation> = {}) =>
      autos.update(rule.id, { runs: (rule.runs ?? 0) + 1, ...extra }),
    [autos],
  )

  const createFromRule = useCallback(
    async (rule: Automation) => {
      const p = paramsOf(rule)
      await tasksHook.create({
        title: p.title || rule.name,
        project: "General",
        status: firstOpenColumn(),
        priority: p.priority ?? "medium",
        due: p.due_in_days != null ? addDays(todayISO(), p.due_in_days) : "",
        notes: `Created by the auto-task “${rule.name}”.`,
        remind_days: -1,
      })
    },
    [tasksHook, firstOpenColumn],
  )

  /** Apply task_created rules to a task before it is saved. */
  const applyTaskCreated = useCallback(
    async (task: NewTask): Promise<NewTask> => {
      let out = { ...task }
      for (const rule of rules.filter((r) => taskMatches(r, "task_created", task))) {
        const p = paramsOf(rule)
        if (rule.action === "set_reminder") out = { ...out, remind_days: p.days ?? 1 }
        else if (rule.action === "set_priority") out = { ...out, priority: p.priority ?? "high" }
        else if (rule.action === "create_task") await createFromRule(rule)
        else if (rule.action === "notify") notify(rule.name, p.message ?? task.title)
        void bump(rule)
      }
      return out
    },
    [rules, createFromRule, bump],
  )

  /** Run task_done rules after a task moves into a done column. */
  const runTaskDone = useCallback(
    async (task: Task) => {
      for (const rule of rules.filter((r) => taskMatches(r, "task_done", task))) {
        const p = paramsOf(rule)
        if (rule.action === "create_task") await createFromRule(rule)
        else if (rule.action === "notify") notify(rule.name, p.message ?? `Done: ${task.title}`)
        void bump(rule)
      }
    },
    [rules, createFromRule, bump],
  )

  /** Run file_uploaded rules. Returns converted files for the caller to save. */
  const runFileRules = useCallback(
    async (file: File): Promise<FileRunResult[]> => {
      const results: FileRunResult[] = []
      for (const rule of rules.filter((r) => fileMatches(r, file.name))) {
        const p = paramsOf(rule)
        try {
          if (rule.action === "convert_file") {
            results.push({ rule, output: await convertFile(file, p.to ?? "pdf") })
          } else if (rule.action === "notify") {
            notify(rule.name, p.message ?? `Uploaded ${file.name}`)
            results.push({ rule })
          }
          void bump(rule)
        } catch (err) {
          results.push({ rule, error: err instanceof Error ? err.message : "Failed" })
        }
      }
      return results
    },
    [rules, bump],
  )

  /** Run scheduled rules that are due today and haven't run yet. */
  const runScheduled = useCallback(async () => {
    const today = todayISO()
    for (const rule of rules.filter((r) => scheduleDue(r, today))) {
      // Mark first so two open tabs don't both run it.
      await bump(rule, { last_run: today })
      const p = paramsOf(rule)
      if (rule.action === "create_task") await createFromRule(rule)
      else if (rule.action === "notify") notify(rule.name, p.message ?? rule.name)
    }
  }, [rules, bump, createFromRule])

  return { rules, autos, loading: autos.loading, applyTaskCreated, runTaskDone, runFileRules, runScheduled }
}

// Saves a file to cloud storage and records it. Storage is per-user.
export function useFileStore() {
  const { create } = useCollection<Attachment>({ collection: "attachments", api: "/api/attachments" })
  const { upload } = useUpload()
  return useCallback(
    async (file: File, opts: { task?: string; convertedFrom?: string } = {}) => {
      const folder = opts.task ? `task-files/${opts.task}` : "library"
      const key = `${folder}/${Date.now()}-${file.name}`
      await upload(file, { key })
      await create({
        task: opts.task ?? "",
        name: file.name,
        key,
        size: file.size,
        converted_from: opts.convertedFrom ?? "",
      })
    },
    [create, upload],
  )
}
