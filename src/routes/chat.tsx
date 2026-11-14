import { useEffect, useMemo, useRef, useState } from "react"
import { ActionCard } from "@/components/assistant-action-card"
import { extractActions } from "@/lib/assistant-actions"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { useChat } from "@omg-dev/ai/react"
import { Bot, History, Lightbulb, ListChecks, PenLine, RotateCcw, Send, Settings, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MembersOnly } from "@/components/members-only"
import { useT } from "@/lib/i18n"
import { botIds, defaultSecretarySettings, readHistory, retentionValue, type BotId, type HistoryRow, type SecretarySettings } from "@/lib/secretary"
import { useConversationAutosave } from "@/lib/use-conversation-autosave"
import { assistantErrorText, diagnosticCode, workspaceHttpError } from "@/lib/assistant-errors"
import { requestAssistant } from "@/lib/assistant-stream"
import { apiFetch } from "@/lib/api-fetch"

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>) => ({ conversation: typeof search.conversation === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(search.conversation) ? search.conversation : undefined }),
  component: () => <MembersOnly><Chat /></MembersOnly>,
})

const bots = [
  { id: "general", name: "All-round secretary", description: "A little of everything: organise, plan, write and brainstorm.", icon: Sparkles, example: "Help me plan my week and draft an update." },
  { id: "organiser", name: "Organiser", description: "Organise your work and priorities.", icon: Bot, example: "Help me prioritise my work today." },
  { id: "planner", name: "Planner", description: "Turn a goal into a practical plan.", icon: ListChecks, example: "Break a product launch into five tasks." },
  { id: "writer", name: "Writer", description: "Draft and polish your writing.", icon: PenLine, example: "Help me write a friendly project update." },
  { id: "brainstormer", name: "Brainstormer", description: "Explore ideas and possibilities.", icon: Lightbulb, example: "Give me ideas for a team workshop." },
] as const

// The built-in hook consumes the server's UI-message event stream. Keep the
// browser transport limited to our own endpoint; the model call stays server-side.
function transport(bot: BotId, preferences: React.RefObject<typeof defaultSecretarySettings>) {
  return {
    async sendMessages({ messages, abortSignal }: { messages: unknown[]; abortSignal: AbortSignal | undefined }) {
      // Read a fresh snapshot for each message using the signed-in user's own collections.
      const collections = await Promise.all(["tasks", "columns", "events"].map(async (name) => {
        let response: Response
        try { response = await apiFetch(`/api/${name}`, { signal: abortSignal }) }
        catch (error) { if (abortSignal?.aborted) throw error; throw new Error("AI_WORKSPACE_NETWORK") }
        if (!response.ok) throw new Error(workspaceHttpError(response.status))
        const rows = await response.json()
        if (!Array.isArray(rows)) throw new Error("AI_WORKSPACE_UNAVAILABLE")
        return rows
      }))
      const [tasks, columns, events] = collections
      const done = new Set(columns.filter((c) => c.done).map((c) => c.id))
      const short = (value: unknown) => typeof value === "string" ? value.slice(0, 500) : ""
      const taskRows = [...tasks].sort((a, b) => Number(done.has(a.status)) - Number(done.has(b.status)) || String(a.due || "9999").localeCompare(String(b.due || "9999")))
      const today = new Date().toLocaleDateString("en-CA")
      // Keep future and still-repeating events ahead of past one-off events.
      const relevant = (event: { date?: string; repeat?: string; repeat_until?: string }) => (event.date || "") >= today || (!!event.repeat && event.repeat !== "none" && (!event.repeat_until || event.repeat_until >= today))
      const eventRows = [...events].sort((a, b) => Number(relevant(b)) - Number(relevant(a)) || (relevant(a) ? String(a.date || "").localeCompare(String(b.date || "")) : String(b.date || "").localeCompare(String(a.date || ""))))
      const context = {
        today,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        tasksTotal: tasks.length, eventsTotal: events.length, columnsTotal: columns.length,
        columns: columns.slice(0, 100).map((c) => ({ id: short(c.id), name: short(c.name), done: !!c.done })),
        tasks: taskRows.slice(0, 100).map((task) => ({ id: short(task.id), title: short(task.title), project: short(task.project), column: short(columns.find((c) => c.id === task.status)?.name), done: done.has(task.status), priority: short(task.priority), due: short(task.due), dueTime: short(task.due_time), notes: short(task.notes) })),
        events: eventRows.slice(0, 100).map((event) => ({ id: short(event.id), title: short(event.title), date: short(event.date), time: short(event.time), notes: short(event.notes), repeat: short(event.repeat), repeatUntil: short(event.repeat_until) })),
      }
      // The hook may add non-text stream markers to assistant messages; send only text.
      const history = (messages as Array<{ id: string; role: string; parts: Array<{ type: string; text?: string }> }>).slice(-30).map((message) => ({
        id: message.id, role: message.role,
        parts: [{ type: "text", text: message.parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("").slice(0, 8000) }],
      })).filter((message) => message.parts[0].text.trim())
      return requestAssistant({ bot, messages: history, context, personalisation: { tone: preferences.current.tone, length: preferences.current.length, instructions: preferences.current.instructions } }, abortSignal)
    },
    async reconnectToStream() { return null },
  }
}
function Chat() {
  const t = useT()
  const [bot, setBot] = useState<BotId>("general")
  const [text, setText] = useState("")
  const { conversation } = Route.useSearch()
  const navigate = useNavigate()
  const [resumeState, setResumeState] = useState<"loading" | "ready" | "error">(conversation ? "loading" : "ready")
  const resumeKey = useRef<string | undefined>(undefined)
  const settings = useCollection<SecretarySettings>({ collection: "secretary_settings", api: "/api/secretary_settings" })
  const [savingDisabledElsewhere, setSavingDisabledElsewhere] = useState(false)
  useEffect(() => {
    const disabled = () => setSavingDisabledElsewhere(true)
    window.addEventListener("secretary-history-disabled", disabled)
    return () => window.removeEventListener("secretary-history-disabled", disabled)
  }, [])
  const preferences = useRef(defaultSecretarySettings)
  const appliedDefault = useRef(false)
  const row = settings.data[0]
  preferences.current = row ? { tone: ["friendly", "professional", "direct"].includes(row.tone) ? row.tone : "friendly", length: ["concise", "balanced", "detailed"].includes(row.length) ? row.length : "balanced", default_bot: row.default_bot, instructions: (row.instructions || "").slice(0, 1000), history_retention: retentionValue(row.history_retention) } : defaultSecretarySettings
  useEffect(() => {
    if (!settings.loading && !settings.error && !appliedDefault.current) {
      appliedDefault.current = true
      if (!conversation && botIds.includes(preferences.current.default_bot as BotId)) setBot(preferences.current.default_bot as BotId)
    }
  }, [settings.loading, settings.error])
  const transports = useMemo(() => Object.fromEntries(bots.map((b) => [b.id, transport(b.id, preferences)])) as Record<BotId, ReturnType<typeof transport>>, [])
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const general = useChat({ id: "general", transport: transports.general })
  const organiser = useChat({ id: "organiser", transport: transports.organiser })
  const planner = useChat({ id: "planner", transport: transports.planner })
  const writer = useChat({ id: "writer", transport: transports.writer })
  const brainstormer = useChat({ id: "brainstormer", transport: transports.brainstormer })
  const chats = { general, organiser, planner, writer, brainstormer }
  const historyEnabled = !settings.loading && !settings.error && !savingDisabledElsewhere && preferences.current.history_retention !== "off"
  const autosave = useConversationAutosave(chats, t("A change was proposed. Review the original conversation for its status."), t("Conversation"), historyEnabled)
  useEffect(() => {
    if (!conversation) { resumeKey.current = undefined; setResumeState("ready"); return }
    if (resumeKey.current === conversation) return
    resumeKey.current = conversation
    setResumeState("loading")
    let cancelled = false
    void (async () => {
      try {
        const response = await apiFetch(`/api/secretary_history/${encodeURIComponent(conversation)}`)
        if (!response.ok) throw new Error("unavailable")
        const row = await response.json() as HistoryRow
        if (!row || !botIds.includes(row.bot as BotId) || typeof row.messages !== "string" || typeof row.title !== "string") throw new Error("invalid")
        const saved = readHistory(row.messages).map((m) => {
          if (m.role === "user") return m
          // Old action proposals are never replayed when a conversation is resumed.
          const parsed = extractActions(m.text)
          const hadIncomplete = parsed.text.includes("```secretary-action")
          return { role: m.role, text: [parsed.text.split("```secretary-action")[0].trim(), ...(parsed.actions.length || parsed.invalid || hadIncomplete ? [t("A change was proposed. Review the original conversation for its status.")] : [])].filter(Boolean).join("\n\n") }
        }).filter((m) => m.text.trim())
        if (!saved.length) throw new Error("empty")
        if (cancelled) return
        const target = row.bot as BotId
        autosave.resume(target, row, saved)
        chats[target].clearError()
        chats[target].setMessages(saved.map((m, index) => ({ id: `history-${row.id}-${index}`, role: m.role, parts: [{ type: "text" as const, text: m.text }] })))
        setBot(target)
        setText("")
        setResumeState("ready")
      } catch { if (!cancelled) setResumeState("error") }
    })()
    return () => { cancelled = true; resumeKey.current = undefined }
  }, [conversation])
  const chat = chats[bot]
  const current = bots.find((b) => b.id === bot)!
  const busy = chat.status === "submitted" || chat.status === "streaming"
  const messages = chat.messages
  const pending = busy || autosave.state !== "saved"
  useEffect(() => {
    if (!pending) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [pending])
  function confirmLeaving(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pending && !window.confirm(t("A reply or save is still in progress. Leave anyway? Recent messages might not be saved."))) event.preventDefault()
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean || busy || chat.error || settings.loading || settings.error || resumeState !== "ready") return
    setText("")
    void chat.sendMessage({ text: clean })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight">{t("Your secretary")}</h1><p className="text-base text-muted-foreground">{t("Choose an assistant for the kind of help you need.")}</p></header>
      <nav className="flex flex-wrap gap-2" aria-label={t("Your secretary")}><Link to="/secretary-history" onClick={confirmLeaving} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><History className="size-4" />{t("History")}</Link><Link to="/secretary-settings" onClick={confirmLeaving} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Settings className="size-4" />{t("Personalisation")}</Link></nav>
      <div className="text-sm text-muted-foreground" role={autosave.state === "error" ? "alert" : "status"}>{autosave.state === "error" ? <>{t("Couldn't autosave. Check your connection and try again.")} <Button type="button" variant="outline" size="sm" onClick={autosave.retry}>{t("Retry saving")}</Button></> : autosave.state === "saving" ? t("Saving conversation…") : settings.loading ? t("Loading history settings…") : settings.error ? t("History saving is unavailable until settings load.") : historyEnabled ? t("Conversations save automatically to your account history.") : t("History saving is off. This conversation will not be saved to your account.")}</div>
      {resumeState === "loading" && <p role="status">{t("Loading conversation…")}</p>}
      {resumeState === "error" && <p role="alert" className="text-destructive">{t("Couldn't load this conversation. It may have been deleted. Return to history and try again.")}</p>}
      {settings.error && <p role="alert" className="text-destructive">{t("Couldn't load your settings. Please refresh before sending a message.")}</p>}
      <div className="grid gap-1.5">
        <label htmlFor="assistant" className="text-sm font-medium">{t("Assistant")}</label>
        <select id="assistant" value={bot} disabled={busy || settings.loading || resumeState !== "ready"} onChange={(e) => { setBot(e.target.value as BotId); setText("") }} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {bots.map((b) => <option key={b.id} value={b.id}>{t(b.name)}</option>)}
        </select>
      </div>
      <Card className="flex-row items-center gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><current.icon className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{t(current.name)}</h2><p className="text-sm text-muted-foreground">{t(current.description)}</p></div>
        {messages.length > 0 && <Button type="button" variant="ghost" size="icon" className="size-11" disabled={busy} aria-label={t("Clear conversation")} onClick={() => { autosave.startNew(bot); chat.setMessages([]); chat.clearError(); if (conversation) void navigate({ to: "/chat", search: { conversation: undefined }, replace: true }) }}><RotateCcw className="size-4" aria-hidden="true" /></Button>}
      </Card>
      <div className="flex flex-1 flex-col gap-3" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 && <div className="rounded-xl border border-dashed border-border p-5 text-center text-muted-foreground"><Sparkles className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" /><p className="text-base">{t("Start a conversation")}</p><p className="mt-1 text-sm">{t("Try: {example}", { example: t(current.example) })}</p></div>}
        {messages.map((m) => {
          const content = m.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
          if (!content) return null
          const parsed = m.role === "assistant" ? extractActions(content) : { text: content, actions: [], invalid: false }
          // Never show a partial JSON block or allow an action while the model is streaming.
          const isStreamingMessage = (chat.status === "streaming") && m.role === "assistant" && m.id === messages[messages.length - 1]?.id
          const visible = isStreamingMessage ? parsed.text.split("```secretary-action")[0].trim() : parsed.text
          return <div key={m.id} className={cn("max-w-[95%] space-y-3 rounded-2xl px-4 py-3 text-base leading-relaxed", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border border-border bg-card")}>
            <span className="sr-only">{m.role === "user" ? t("You") : t(current.name)}: </span>
            {visible && <div className="whitespace-pre-wrap break-words">{visible}</div>}
            {!isStreamingMessage && parsed.actions.map((action, i) => <ActionCard key={`${m.id}-${i}`} action={action} completed={!!completed[`${m.id}-${i}`]} onComplete={() => setCompleted((prev) => ({ ...prev, [`${m.id}-${i}`]: true }))} />)}
            {!isStreamingMessage && parsed.invalid && <p role="alert">{t("The proposed change could not be understood. Please ask again.")}</p>}
          </div>
        })}
        {busy && <p className="text-sm text-muted-foreground">{t("Thinking…")}</p>}
        {chat.error && <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive"><p>{t(assistantErrorText(chat.error.message))}</p><p>{t("Diagnostic code")}: {diagnosticCode(chat.error.message)}</p><Button variant="outline" className="h-11" onClick={() => { chat.clearError(); void chat.regenerate() }} disabled={busy}>{t("Try again")}</Button></div>}
      </div>
      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Message")} aria-label={t("Message")} maxLength={8000} rows={2} className="min-h-11 flex-1 resize-y text-base" />
        <Button type="submit" className="size-11" disabled={busy || !!chat.error || settings.loading || !!settings.error || resumeState !== "ready" || !text.trim()} aria-label={t("Send")}><Send className="size-5" aria-hidden="true" /></Button>
      </form>
      <p className="text-sm text-muted-foreground">{t("Your board and calendar details are sent to the AI with each message. Review and confirm each proposed change before it is saved.")}</p>
      <p className="text-sm text-muted-foreground">{historyEnabled ? t("History keeps the latest 60 messages per conversation. You can continue a saved conversation; earlier proposed changes cannot be replayed.") : t("New messages in continued conversations are not saved while history saving is off.")}</p>
    </main>
  )
}
