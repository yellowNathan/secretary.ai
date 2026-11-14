import type { Automation, AutomationAction, AutomationTrigger, Priority, Task } from "@/lib/tasks"
import { extOf, formatLabels, type Format } from "@/lib/convert"

// An auto-task is "when <trigger> (and <condition>) then <action>".
// Rules run in the browser while the app is open: file and task rules run the
// moment the file or task is added, scheduled rules run the first time the app
// is opened on a day they are due.

export type Condition = {
  ext?: string
  project?: string
  priority?: Priority
  every?: "day" | "week" | "month"
  weekday?: number
  day?: number
}
export type Params = {
  to?: Format
  days?: number
  priority?: Priority
  title?: string
  due_in_days?: number
  message?: string
}

export type AutomationDraft = {
  name: string
  trigger: AutomationTrigger
  condition: Condition
  action: AutomationAction
  params: Params
}

export function parseJson<T>(s: string | null | undefined): T {
  try {
    return (s ? JSON.parse(s) : {}) as T
  } catch {
    return {} as T
  }
}

export function conditionOf(a: Automation): Condition {
  return parseJson<Condition>(a.condition)
}
export function paramsOf(a: Automation): Params {
  return parseJson<Params>(a.params)
}

export function toRow(d: AutomationDraft) {
  return {
    name: d.name,
    trigger: d.trigger,
    condition: JSON.stringify(d.condition),
    action: d.action,
    params: JSON.stringify(d.params),
    enabled: true,
    last_run: "",
    runs: 0,
  }
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function describeTrigger(trigger: string, c: Condition): string {
  switch (trigger) {
    case "file_uploaded":
      return !c.ext || c.ext === "any" ? "When any file is uploaded" : `When a .${c.ext} file is uploaded`
    case "task_created":
    case "task_done": {
      const what = trigger === "task_created" ? "is added" : "is moved to a done column"
      const bits = [c.priority && `${c.priority}-priority`, c.project && `in “${c.project}”`].filter(Boolean)
      return `When a ${bits.length ? bits.join(" ") + " " : ""}task ${what}`
    }
    case "schedule":
      if (c.every === "week") return `Every ${weekdayNames[c.weekday ?? 1]}`
      if (c.every === "month") return `On day ${c.day ?? 1} of every month`
      return "Every day"
    default:
      return "When something happens"
  }
}

export function describeAction(action: string, p: Params): string {
  switch (action) {
    case "convert_file":
      return `convert it to ${p.to ? formatLabels[p.to] : "PDF"}`
    case "set_reminder":
      return p.days === 0 ? "remind me on the due day" : `remind me ${p.days ?? 1} day${p.days === 1 ? "" : "s"} before it's due`
    case "set_priority":
      return `set priority to ${p.priority ?? "high"}`
    case "create_task":
      return `create the task “${p.title ?? "New task"}”${p.due_in_days != null ? ` due in ${p.due_in_days} day${p.due_in_days === 1 ? "" : "s"}` : ""}`
    case "notify":
      return `notify me: “${p.message ?? "Reminder"}”`
    default:
      return "do something"
  }
}

export function describe(d: { trigger: string; action: string; condition: Condition; params: Params }): string {
  return `${describeTrigger(d.trigger, d.condition)}, ${describeAction(d.action, d.params)}.`
}

// Which actions make sense for each trigger.
export const actionsFor: Record<AutomationTrigger, AutomationAction[]> = {
  file_uploaded: ["convert_file", "notify"],
  task_created: ["set_reminder", "set_priority", "create_task", "notify"],
  task_done: ["create_task", "notify"],
  schedule: ["create_task", "notify"],
}

export const DEFAULT_AUTOMATIONS: AutomationDraft[] = [
  {
    name: "Word to PDF",
    trigger: "file_uploaded",
    condition: { ext: "docx" },
    action: "convert_file",
    params: { to: "pdf" },
  },
  {
    name: "Images to PDF",
    trigger: "file_uploaded",
    condition: { ext: "jpg" },
    action: "convert_file",
    params: { to: "pdf" },
  },
  {
    name: "Heads-up on urgent work",
    trigger: "task_created",
    condition: { priority: "high" },
    action: "set_reminder",
    params: { days: 1 },
  },
  {
    name: "Weekly review",
    trigger: "schedule",
    condition: { every: "week", weekday: 1 },
    action: "create_task",
    params: { title: "Weekly review", priority: "medium", due_in_days: 0 },
  },
  {
    name: "Morning check-in",
    trigger: "schedule",
    condition: { every: "day" },
    action: "notify",
    params: { message: "Check today's deadlines in secretary.ai" },
  },
]

// ── Matching ────────────────────────────────────────────────────────────────

const extAliases: Record<string, string[]> = {
  jpg: ["jpg", "jpeg"],
  doc: ["doc", "docx"],
  docx: ["docx"],
}

export function fileMatches(a: Automation, fileName: string): boolean {
  if (!a.enabled || a.trigger !== "file_uploaded") return false
  const want = (conditionOf(a).ext ?? "any").toLowerCase()
  if (want === "any") return true
  const ext = extOf(fileName)
  return (extAliases[want] ?? [want]).includes(ext)
}

export function taskMatches(a: Automation, trigger: "task_created" | "task_done", task: Pick<Task, "project" | "priority">): boolean {
  if (!a.enabled || a.trigger !== trigger) return false
  const c = conditionOf(a)
  if (c.priority && c.priority !== task.priority) return false
  if (c.project && c.project.toLowerCase() !== (task.project ?? "").toLowerCase()) return false
  return true
}

export function scheduleDue(a: Automation, today: string): boolean {
  if (!a.enabled || a.trigger !== "schedule" || a.last_run === today) return false
  const c = conditionOf(a)
  const d = new Date(`${today}T00:00:00`)
  if (c.every === "week") return d.getDay() === (c.weekday ?? 1)
  if (c.every === "month") return d.getDate() === (c.day ?? 1)
  return true
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission === "granted") new Notification(title, { body })
}

// ── Plain-language parser (used when the AI isn't available) ────────────────

const formatWords: [RegExp, Format][] = [
  [/\bpdfs?\b/, "pdf"],
  [/\b(txt|text|plain text)\b/, "txt"],
  [/\bhtml|web page\b/, "html"],
  [/\bpng\b/, "png"],
  [/\bjpe?g\b/, "jpg"],
  [/\bwebp\b/, "webp"],
  [/\bjson\b/, "json"],
  [/\bcsv\b/, "csv"],
]
const sourceWords: [RegExp, string][] = [
  [/\b(docx|word)\b/, "docx"],
  [/\b(images?|photos?|pictures?|jpe?g|jpgs)\b/, "jpg"],
  [/\bpng\b/, "png"],
  [/\b(txt|text files?|notes?)\b/, "txt"],
  [/\bmarkdown|\bmd\b/, "md"],
  [/\bcsv\b/, "csv"],
  [/\bjson\b/, "json"],
]

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Turn requests like "convert every docx I upload into pdf" into an auto-task. */
export function parseAutomationText(input: string): AutomationDraft | null {
  const text = input.toLowerCase()

  // File conversion: "convert ... X ... (to|into) Y"
  if (/\bconvert|turn\b/.test(text)) {
    const m = text.match(/\b(?:to|into)\s+(?:a\s+|an\s+)?([a-z ]+)/)
    const targetText = m ? m[1] : text
    const to = formatWords.find(([re]) => re.test(targetText))?.[1]
    const before = m ? text.slice(0, m.index) : text
    const from = sourceWords.find(([re]) => re.test(before))?.[1] ?? (/\b(all|any|every) files?\b/.test(before) ? "any" : undefined)
    if (to && from) {
      const fromLabel = from === "any" ? "Files" : from.toUpperCase()
      return {
        name: `${fromLabel} to ${to.toUpperCase()}`,
        trigger: "file_uploaded",
        condition: { ext: from },
        action: "convert_file",
        params: { to },
      }
    }
  }

  // Schedules: "every monday create a task called X" / "every day remind me to X"
  const every = text.match(/\bevery\s+(day|morning|weekday|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)
  if (every) {
    const word = every[1]
    const wd = weekdayNames.findIndex((n) => n.toLowerCase() === word)
    const condition: Condition =
      wd >= 0 ? { every: "week", weekday: wd } : word === "week" ? { every: "week", weekday: 1 } : word === "month" ? { every: "month", day: 1 } : { every: "day" }
    const quoted = input.match(/["“']([^"”']+)["”']/)?.[1]
    const after = input.replace(/.*?\b(?:called|named|to|task)\b\s*/i, "").replace(/["“”']/g, "").trim()
    const title = cap((quoted ?? after ?? "").replace(/\bevery\s+\w+\b/i, "").trim()) || "Recurring task"
    if (/\b(remind|notify|alert)\b/.test(text) && !/\btask\b/.test(text)) {
      return { name: `${cap(word)} reminder`, trigger: "schedule", condition, action: "notify", params: { message: title } }
    }
    return {
      name: title,
      trigger: "schedule",
      condition,
      action: "create_task",
      params: { title, priority: "medium", due_in_days: 0 },
    }
  }

  // Reminders on new tasks: "remind me 2 days before high priority deadlines"
  if (/\bremind\b/.test(text) && /\b(before|deadline|due)\b/.test(text)) {
    const days = Number(text.match(/(\d+)\s*days?/)?.[1] ?? (/\bweek\b/.test(text) ? 7 : 1))
    const priority = (["high", "medium", "low"] as Priority[]).find((p) => text.includes(`${p} priority`) || text.includes(`${p}-priority`))
    return {
      name: `Remind ${days} day${days === 1 ? "" : "s"} before${priority ? ` (${priority})` : ""}`,
      trigger: "task_created",
      condition: priority ? { priority } : {},
      action: "set_reminder",
      params: { days },
    }
  }

  return null
}

/** Pull an <autotask>{...}</autotask> block out of an AI reply. */
export function extractAutotask(reply: string): { text: string; draft: AutomationDraft | null } {
  const m = reply.match(/<autotask>([\s\S]*?)<\/autotask>/)
  if (!m) return { text: reply, draft: null }
  const text = reply.replace(m[0], "").trim()
  try {
    const d = JSON.parse(m[1]) as AutomationDraft
    if (!d.trigger || !d.action) return { text, draft: null }
    return { text, draft: { ...d, condition: d.condition ?? {}, params: d.params ?? {}, name: d.name || "Auto-task" } }
  } catch {
    return { text, draft: null }
  }
}
