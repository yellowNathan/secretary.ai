import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Bot, Lightbulb, ListChecks, PenLine, RotateCcw, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MembersOnly } from "@/components/members-only"
import { useT } from "@/lib/i18n"

export const Route = createFileRoute("/chat")({ component: () => <MembersOnly><Chat /></MembersOnly> })

type BotId = "organiser" | "planner" | "writer" | "brainstormer"
type Msg = { id: string; role: "user" | "assistant"; text: string }
const bots = [
  { id: "organiser", name: "Organiser", description: "Organise your work and priorities.", icon: Bot, example: "Help me prioritise my work today." },
  { id: "planner", name: "Planner", description: "Turn a goal into a practical plan.", icon: ListChecks, example: "Break a product launch into five tasks." },
  { id: "writer", name: "Writer", description: "Draft and polish your writing.", icon: PenLine, example: "Help me write a friendly project update." },
  { id: "brainstormer", name: "Brainstormer", description: "Explore ideas and possibilities.", icon: Lightbulb, example: "Give me ideas for a team workshop." },
] as const

type Histories = Record<BotId, Msg[]>
const empty: Histories = { organiser: [], planner: [], writer: [], brainstormer: [] }

function Chat() {
  const t = useT()
  const [bot, setBot] = useState<BotId>("organiser")
  const [histories, setHistories] = useState<Histories>(empty)
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<"unavailable" | "failed" | null>(null)
  const [pending, setPending] = useState<Msg[] | null>(null)
  const current = bots.find((b) => b.id === bot)!
  const messages = histories[bot]

  async function ask(history: Msg[], selected: BotId) {
    setBusy(true)
    setError(null)
    setPending(history)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot: selected, messages: history.slice(-30).map((m) => ({ role: m.role, content: m.text })) }),
      })
      if (!res.ok) { setError(res.status === 503 ? "unavailable" : "failed"); return }
      const reply = (await res.text()).trim()
      if (!reply) throw new Error("Empty response")
      setHistories((h) => ({ ...h, [selected]: [...history, { id: crypto.randomUUID(), role: "assistant", text: reply }] }))
      setPending(null)
    } catch { setError("failed") } finally { setBusy(false) }
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean || busy || error) return
    const next: Msg[] = [...messages, { id: crypto.randomUUID(), role: "user", text: clean }]
    setHistories((h) => ({ ...h, [bot]: next }))
    setText("")
    void ask(next, bot)
  }

  function changeBot(next: BotId) {
    setBot(next)
    setError(null)
    setPending(null)
    setText("")
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Your secretary")}</h1>
        <p className="text-base text-muted-foreground">{t("Choose an assistant for the kind of help you need.")}</p>
      </header>
      <div className="grid gap-1.5">
        <label htmlFor="assistant" className="text-sm font-medium">{t("Assistant")}</label>
        <select id="assistant" value={bot} disabled={busy} onChange={(e) => changeBot(e.target.value as BotId)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {bots.map((b) => <option key={b.id} value={b.id}>{t(b.name)}</option>)}
        </select>
      </div>
      <Card className="flex-row items-center gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><current.icon className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{t(current.name)}</h2><p className="text-sm text-muted-foreground">{t(current.description)}</p></div>
        {messages.length > 0 && <Button type="button" variant="ghost" size="icon" className="size-11" disabled={busy} aria-label={t("Clear conversation")} onClick={() => { setHistories((h) => ({ ...h, [bot]: [] })); setError(null); setPending(null) }}><RotateCcw className="size-4" aria-hidden="true" /></Button>}
      </Card>
      <div className="flex flex-1 flex-col gap-3" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 && <div className="rounded-xl border border-dashed border-border p-5 text-center text-muted-foreground"><Sparkles className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" /><p className="text-base">{t("Start a conversation")}</p><p className="mt-1 text-sm">{t("Try: {example}", { example: t(current.example) })}</p></div>}
        {messages.map((m) => <div key={m.id} className={cn("max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-base leading-relaxed", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto border border-border bg-card")}><span className="sr-only">{m.role === "user" ? t("You") : t(current.name)}: </span>{m.text}</div>)}
        {busy && <p className="text-sm text-muted-foreground">{t("Thinking…")}</p>}
        {error && <div role="alert" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-base text-destructive"><p>{error === "unavailable" ? t("The AI service is not configured yet. Please try again later.") : t("The assistant couldn't reply. Please try again.")}</p><Button variant="outline" className="h-11" onClick={() => pending && void ask(pending, bot)} disabled={!pending || busy}>{t("Try again")}</Button></div>}
      </div>
      <form onSubmit={send} className="flex items-end gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Message")} aria-label={t("Message")} maxLength={8000} rows={2} className="min-h-11 flex-1 resize-y text-base" />
        <Button type="submit" className="size-11" disabled={busy || !!error || !text.trim()} aria-label={t("Send")}><Send className="size-5" aria-hidden="true" /></Button>
      </form>
      <p className="text-sm text-muted-foreground">{t("Conversations stay on this page and are not saved when you leave.")}</p>
    </main>
  )
}
