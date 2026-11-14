import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n"
import type { AssistantAction } from "@/lib/assistant-actions"
import { apiFetch } from "@/lib/api-fetch"

const labels: Record<string, string> = { name: "Column name", title: "Title", project: "Project", status: "Column", priority: "Priority", due: "Due date", due_time: "Due time", notes: "Notes", remind_before: "Reminder offset (seconds)", date: "Date", time: "Time", repeat: "Repeat", repeat_until: "Repeat until" }

type Row = Record<string, unknown>
async function getRows(collection: string): Promise<Row[]> {
  const response = await apiFetch(`/api/${collection}`, { cache: "no-store" })
  if (!response.ok) throw new Error("load")
  const data = await response.json()
  if (!Array.isArray(data)) throw new Error("load")
  return data
}

export function ActionCard({ action, completed, onComplete }: { action: AssistantAction; completed: boolean; onComplete: () => void }) {
  const t = useT()
  const [state, setState] = useState<"idle" | "loading" | "done" | "dismissed" | "error" | "uncertain">("idle")
  const [detail, setDetail] = useState("")
  const lock = useRef(false)
  const [preview, setPreview] = useState<{ target: string; version: unknown; fields: Array<[string, string]>; original: Row } | null>(null)

  async function review() {
    if (lock.current) return
    lock.current = true; setState("loading"); setDetail("")
    try {
      const [rows, columns] = await Promise.all([getRows(action.collection), getRows("columns")])
      const target = action.id ? rows.find((r) => r.id === action.id) : undefined
      if (action.id && !target) throw new Error("missing")
      const fields = Object.entries(action.fields || {}).map(([key, value]) => {
        if (key === "status") {
          const col = columns.find((c) => c.id === value)
          if (!col) throw new Error("column")
          return [key, String(col.name)] as [string, string]
        }
        return [key, String(value)] as [string, string]
      })
      setPreview({ target: String(target?.title || ""), version: target?.updated_at, fields, original: target || {} })
      setState("idle")
    } catch { setState("error"); setDetail(t("This item or its column is no longer available. Please ask the assistant again.")) }
    finally { lock.current = false }
  }

  async function apply() {
    if (lock.current || !preview) return
    lock.current = true; setState("loading"); setDetail("")
    let submitted = false
    try {
      // Recheck that the reviewed target and destination still exist before writing.
      const [rows, columns] = await Promise.all([getRows(action.collection), getRows("columns")])
      const target = action.id ? rows.find((r) => r.id === action.id) : undefined
      if (action.id && (!target || target.title !== preview.target || target.updated_at !== preview.version)) throw new Error("changed")
      const column = action.fields?.status && columns.find((c) => c.id === action.fields?.status)
      if (action.fields?.status && (!column || String(column.name) !== preview.fields.find(([k]) => k === "status")?.[1])) throw new Error("changed")
      if (target && action.operation === "update") {
        // Ensure the fields being changed have not been edited since review.
        for (const [key] of preview.fields) if (String(target[key] ?? "") !== String(preview.original[key] ?? "")) throw new Error("changed")
      }
      const defaults = action.collection === "columns" ? { position: columns.reduce((max, col) => Math.max(max, typeof col.position === "number" && Number.isFinite(col.position) ? col.position : -1), -1) + 1, done: false } : action.collection === "tasks" ? { project: "General", priority: "medium", due: "", due_time: "", notes: "", remind_days: -1, remind_before: -1 } : { time: "", notes: "", remind_days: -1, remind_before: -1, repeat: "none", repeat_until: "" }
      const body = action.operation === "create" ? { ...defaults, ...action.fields } : action.fields
      submitted = true
      const response = await apiFetch(`/api/${action.collection}${action.id ? `/${encodeURIComponent(action.id)}` : ""}`, { method: action.operation === "create" ? "POST" : action.operation === "update" ? "PATCH" : "DELETE", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) })
      if (!response.ok) throw new Error("save")
      onComplete(); setState("done")
    } catch (error) {
      if (submitted) { setState("uncertain"); setDetail(t("The save result is uncertain. Check your board or calendar before trying again.")) }
      else { setState("error"); setDetail(error instanceof Error && error.message === "changed" ? t("This item changed since review. Please review it again.") : t("Could not review the change. Please check your connection and try again.")) }
    }
    finally { lock.current = false }
  }

  const heading = action.operation === "create" ? (action.collection === "columns" ? "Create column" : action.collection === "tasks" ? "Create task" : "Create event") : action.operation === "update" ? (action.collection === "tasks" ? "Update task" : "Update event") : (action.collection === "tasks" ? "Delete task" : "Delete event")
  return <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
    <p className="font-semibold">{t(heading)}</p>
    {preview && <><p>{preview.target}</p>{action.id && <p className="text-muted-foreground">{action.collection === "events" ? `${String(preview.original.date || "")} ${String(preview.original.time || "")}` : `${String(preview.original.project || "")} · ${String(preview.original.due || t("No due date"))}`}</p>}{action.operation === "delete" && <p>{t("This item will be permanently deleted.")}</p>}{action.operation === "create" && <p>{action.collection === "columns" ? t("The column will be added at the end of your board and marked as not done.") : t("Unspecified fields use the app's defaults, including no reminder.")}</p>}<dl>{preview.fields.map(([key, value]) => <div key={key} className="break-words"><dt className="inline font-medium">{t(labels[key] || key)}: </dt><dd className="inline whitespace-pre-wrap">{value || "—"}</dd></div>)}</dl></>}
    {completed || state === "done" ? <p role="status">{t("Change saved")}</p> : state === "uncertain" ? <p role="alert">{detail}</p> : state === "dismissed" ? <p role="status">{t("Change dismissed")}</p> : <>
      {detail && <p role="alert" className="text-destructive">{detail}</p>}
      <div className="flex flex-wrap gap-2">
        {!preview || state === "error" ? <Button type="button" size="sm" onClick={() => void review()} disabled={state === "loading"}>{t("Review change")}</Button> : <Button type="button" size="sm" onClick={() => void apply()} disabled={state === "loading"}>{t("Confirm change")}</Button>}
        <Button type="button" size="sm" variant="outline" onClick={() => setState("dismissed")} disabled={state === "loading"}>{t("Dismiss")}</Button>
      </div>
    </>}
  </div>
}
