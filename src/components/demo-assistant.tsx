import { useMemo, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@omg-dev/sdk"
import { useChat } from "@omg-dev/ai/react"
import { Bot, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { extractActions, type AssistantAction } from "@/lib/assistant-actions"
import type { Store } from "@/lib/local-store"
import type { Column, Task } from "@/lib/tasks"
import { useT } from "@/lib/i18n"
import { assistantErrorText, diagnosticCode } from "@/lib/assistant-errors"
import { requestAssistant } from "@/lib/assistant-stream"

type Props = { tasks: Store<Task>; columns: Store<Column> }

type Message = { id: string; role: string; parts: Array<{ type: string; text?: string }> }

// Only the local demo board is sent; never fetch the signed-in workspace here.
function demoTransport(snapshot: React.RefObject<Props>) {
  return {
    async sendMessages({ messages, abortSignal }: { messages: unknown[]; abortSignal?: AbortSignal }) {
      const { tasks, columns } = snapshot.current
      const done = new Set(columns.data.filter((c) => c.done).map((c) => c.id))
      const short = (v: unknown) => typeof v === "string" ? v.slice(0, 500) : ""
      const context = {
        today: new Date().toLocaleDateString("en-CA"), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tasksTotal: tasks.data.length, columnsTotal: columns.data.length, eventsTotal: 0,
        columns: columns.data.slice(0, 100).map((c) => ({ id: short(c.id), name: short(c.name), done: c.done })),
        tasks: tasks.data.slice(0, 100).map((task) => ({ id: short(task.id), title: short(task.title), project: short(task.project), column: short(columns.data.find((c) => c.id === task.status)?.name), done: done.has(task.status), priority: task.priority, due: short(task.due), dueTime: short(task.due_time), notes: short(task.notes) })), events: [],
      }
      const history = (messages as Message[]).slice(-30).map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text", text: m.parts.filter((p) => p.type === "text").map((p) => p.text || "").join("").slice(0, 8000) }] })).filter((m) => m.parts[0].text.trim())
      return requestAssistant({ bot: "organiser", messages: history, context, demo: true }, abortSignal)
    },
    async reconnectToStream() { return null },
  }
}

function DemoAction({ action, tasks, columns }: Props & { action: AssistantAction }) {
  const t = useT()
  const [state, setState] = useState<"pending" | "working" | "done" | "dismissed" | "error">("pending")
  const lock = useRef(false)
  if (action.collection !== "tasks") return <p className="text-sm text-muted-foreground">{t("The demo can only change practice board tasks.")}</p>
  const target = action.id ? tasks.data.find((task) => task.id === action.id) : undefined
  const destination = action.fields?.status ? columns.data.find((c) => c.id === action.fields?.status) : undefined
  const unavailable = (!!action.id && !target) || (!!action.fields?.status && !destination)
  async function apply() {
    if (lock.current || unavailable || state !== "pending") return
    lock.current = true; setState("working")
    try {
      if (action.operation === "create") await tasks.create({ project: "General", priority: "medium", due: "", due_time: "", notes: "", remind_days: -1, remind_before: -1, ...action.fields } as Partial<Task>)
      else if (action.operation === "update" && action.id) await tasks.update(action.id, action.fields as Partial<Task>)
      else if (action.operation === "delete" && action.id) await tasks.remove(action.id)
      else throw new Error("Invalid action")
      setState("done")
    } catch { setState("error") }
    finally { lock.current = false }
  }
  const heading = action.operation === "create" ? "Create task" : action.operation === "update" ? "Update task" : "Delete task"
  const labels: Record<string, string> = { title: "Title", project: "Project", status: "Column", priority: "Priority", due: "Due date", due_time: "Due time", notes: "Notes", remind_before: "Reminder offset (seconds)" }
  return <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
    <p className="font-semibold">{t(heading)}{target ? `: ${target.title}` : ""}</p>
    {action.operation === "delete" && <p>{t("This practice task will be deleted.")}</p>}
    {action.operation === "create" && <p>{t("Unspecified fields use the app's defaults, including no reminder.")}</p>}
    {Object.entries(action.fields || {}).map(([key, value]) => <p className="break-words" key={key}><strong>{t(labels[key] || key)}:</strong> {key === "status" ? destination?.name || t("Unavailable") : String(value) || "—"}</p>)}
    {unavailable && state === "pending" && <p role="alert">{t("This item or column is no longer available. Please ask again.")}</p>}
    {state === "done" ? <p role="status">{t("Change saved in the demo")}</p> : state === "dismissed" ? <p>{t("Change dismissed")}</p> : state === "error" ? <p role="alert">{t("Could not change the demo board. Please ask again.")}</p> : <div className="flex flex-wrap gap-2"><Button size="sm" type="button" onClick={() => void apply()} disabled={unavailable || state === "working"}>{t("Confirm change")}</Button><Button size="sm" type="button" variant="outline" onClick={() => setState("dismissed")} disabled={state === "working"}>{t("Dismiss")}</Button></div>}
  </div>
}

export function DemoAssistant(props: Props) {
  const t = useT()
  const { user, loading } = useAuth()
  const [text, setText] = useState("")
  const [practice, setPractice] = useState(false)
  const snapshot = useRef(props); snapshot.current = props
  const transport = useMemo(() => demoTransport(snapshot), [])
  const chat = useChat({ id: "demo-organiser", transport })
  const busy = chat.status === "submitted" || chat.status === "streaming"
  const open = props.tasks.data.filter((task) => !props.columns.data.find((c) => c.id === task.status)?.done)
  const top = [...open].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1) || (a.due || "9999").localeCompare(b.due || "9999"))[0]
  function send(e: React.FormEvent) { e.preventDefault(); const clean = text.trim(); if (!clean || busy || chat.error) return; setText(""); void chat.sendMessage({ text: clean }) }
  return <Card className="gap-4 p-4 sm:p-5">
    <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="size-5" aria-hidden="true" /></span><div><h2 className="font-semibold">{t("Demo secretary")}</h2><p className="text-sm text-muted-foreground">{t("Try a simplified assistant with your practice board.")}</p></div></div>
    {loading ? <p className="text-sm text-muted-foreground">{t("Loading…")}</p> : !user ? <div className="space-y-3"><p className="text-sm text-muted-foreground">{t("This practice helper is not AI: it picks a task by priority and due date, on this device. Sign in to try the AI secretary with your demo board.")}</p><Button type="button" variant="outline" onClick={() => setPractice(true)}><Sparkles className="size-4" />{t("Find a priority")}</Button>{practice && <p role="status" className="rounded-lg bg-muted p-3 text-sm">{top ? t("Try focusing on: {task}", { task: top.title }) : t("There are no open practice tasks.")}</p>}<Link to="/signin" className="block text-sm font-medium text-primary underline">{t("Sign in to try AI")}</Link></div> : <>
      <p className="text-sm text-muted-foreground">{t("Messages and practice board details are sent to AI. Changes only affect this demo on your device and need your confirmation. The demo has no calendar.")}</p>
      <div aria-live="polite" aria-busy={busy} className="max-h-80 space-y-3 overflow-auto">
        {chat.messages.length === 0 && <p className="rounded-lg bg-muted p-3 text-sm">{t("Try asking: What should I prioritise? Or ask me to add a task to Backlog.")}</p>}
        {chat.messages.map((m) => {
          const content = m.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
          if (!content) return null
          const parsed = m.role === "assistant" ? extractActions(content) : { text: content, actions: [], invalid: false }
          const streaming = chat.status === "streaming" && m.role === "assistant" && m.id === chat.messages[chat.messages.length - 1]?.id
          const visible = streaming ? parsed.text.split("```secretary-action")[0].trim() : parsed.text
          return <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[95%] rounded-xl bg-primary p-3 text-sm text-primary-foreground" : "max-w-[95%] space-y-2 rounded-xl border border-border p-3 text-sm"}><span className="sr-only">{m.role === "user" ? t("You") : t("Demo secretary")}: </span>{visible && <p className="whitespace-pre-wrap break-words">{visible}</p>}{!streaming && parsed.actions.map((action, i) => <DemoAction key={`${m.id}-${i}`} action={action} {...props} />)}{!streaming && parsed.invalid && <p role="alert">{t("The proposed change could not be understood. Please ask again.")}</p>}</div>
        })}
        {busy && <p className="text-sm text-muted-foreground">{t("Thinking…")}</p>}
        {chat.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{t(assistantErrorText(chat.error.message))}</p><p>{t("Diagnostic code")}: {diagnosticCode(chat.error.message)}</p><Button type="button" size="sm" variant="outline" onClick={() => { chat.clearError(); void chat.regenerate() }}>{t("Try again")}</Button></div>}
      </div>
      <form onSubmit={send} className="flex items-end gap-2"><Textarea aria-label={t("Message")} placeholder={t("Message")} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={1} className="min-h-11 flex-1" /><Button type="submit" size="icon" className="size-11" aria-label={t("Send")} disabled={busy || !!chat.error || !text.trim()}><Send className="size-4" /></Button></form>
    </>}
  </Card>
}
