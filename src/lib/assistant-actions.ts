export type AssistantAction = {
  operation: "create" | "update" | "delete"
  collection: "tasks" | "events" | "columns"
  id?: string
  fields?: Record<string, string | number>
}

const allowed: Record<AssistantAction["collection"], string[]> = {
  tasks: ["title", "project", "status", "priority", "due", "due_time", "notes", "remind_before"],
  events: ["title", "date", "time", "notes", "remind_before", "repeat", "repeat_until"],
  columns: ["name"],
}
const dateValid = (v: string) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v)
const timeValid = (v: string) => v === "" || /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(v)

export function parseAction(value: unknown): AssistantAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const a = value as Record<string, unknown>
  if (!["create", "update", "delete"].includes(String(a.operation)) || !["tasks", "events", "columns"].includes(String(a.collection))) return null
  if (Object.keys(a).some((k) => !["operation", "collection", "id", "fields"].includes(k))) return null
  const collection = a.collection as AssistantAction["collection"]
  // Column creation only: renaming, marking done and deletion are not supported by the assistant.
  if (collection === "columns" && a.operation !== "create") return null
  if (a.operation !== "create" && (typeof a.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(a.id))) return null
  // Some models include an empty placeholder ID despite being told to omit it.
  // Normalise only that harmless form; never accept an actual ID on a create.
  if (a.operation === "create" && a.id !== undefined && a.id !== "") return null
  if (a.operation === "delete") return a.fields === undefined ? a as AssistantAction : null
  if (!a.fields || typeof a.fields !== "object" || Array.isArray(a.fields)) return null
  const fields = a.fields as Record<string, unknown>
  if (!Object.keys(fields).length || Object.keys(fields).some((k) => !allowed[collection].includes(k))) return null
  for (const [k, v] of Object.entries(fields)) {
    if (k === "remind_before") { if (typeof v !== "number" || !Number.isInteger(v) || v < -1 || v > 31536000) return null; continue }
    if (typeof v !== "string" || v.length > 2000) return null
    if (["title", "status", "name"].includes(k) && !v.trim()) return null
    if (k === "name" && (v.trim().length > 100 || v !== v.trim())) return null
    if (["due", "date", "repeat_until"].includes(k) && !dateValid(v)) return null
    if (["due_time", "time"].includes(k) && !timeValid(v)) return null
    if (k === "priority" && !["low", "medium", "high"].includes(v)) return null
    if (k === "repeat" && !["none", "daily", "weekly", "monthly", "yearly"].includes(v)) return null
  }
  if (a.operation === "create" && (collection === "columns" ? !fields.name : !fields.title || (collection === "tasks" ? !fields.status : !fields.date))) return null
  if (collection === "events" && "date" in fields && !fields.date) return null
  if (a.operation === "create" && a.id === "") {
    const { id: _emptyId, ...create } = a
    return create as AssistantAction
  }
  return a as AssistantAction
}

// Only completed action blocks are actionable. Text outside the block remains visible.
export function extractActions(content: string): { text: string; actions: AssistantAction[]; invalid: boolean } {
  const actions: AssistantAction[] = []
  let invalid = false
  const text = content.replace(/```secretary-action\s*\n([\s\S]*?)```/g, (_whole, raw: string) => {
    try { const a = parseAction(JSON.parse(raw)); if (a) actions.push(a); else invalid = true } catch { invalid = true }
    return ""
  }).trim()
  return { text, actions: actions.slice(0, 10), invalid: invalid || actions.length > 10 }
}
