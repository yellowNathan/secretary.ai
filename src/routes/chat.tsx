import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MembersOnly } from "@/components/members-only"
import { t, useT } from "@/lib/i18n"

export const Route = createFileRoute("/chat")({
  component: () => (
    <MembersOnly>
      <Chat />
    </MembersOnly>
  ),
})

type Msg = { id: number; role: "user" | "assistant"; text: string }

// Sends the conversation to POST /api/chat and expects the reply as plain text.
async function askAssistant(history: Msg[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, content: m.text })),
    }),
  })
  if (!res.ok) throw new Error(`Chat failed (${res.status})`)
  return res.text()
}

function Chat() {
  useT()
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const clean = text.trim()
    if (!clean || busy) return
    const next: Msg[] = [...messages, { id: Date.now(), role: "user", text: clean }]
    setMessages(next)
    setText("")
    setBusy(true)
    setError(null)
    try {
      const reply = await askAssistant(next)
      setMessages((m) => [...m, { id: Date.now() + 1, role: "assistant", text: reply }])
    } catch {
      setError(t("The AI couldn't reply. The chat service isn't available in this build yet."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 sm:px-6" style={{ minHeight: "calc(100svh - 57px)" }}>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("AI chat")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("Ask for help planning, prioritising or writing up your work.")}</p>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {t("Try: “Break a product launch into five tasks.”")}
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-card border border-border",
            )}
          >
            {m.text}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">{t("Thinking…")}</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Message")} aria-label={t("Message")} />
        <Button type="submit" disabled={busy || !text.trim()} aria-label={t("Send")}>
          <Send className="size-4" />
        </Button>
      </form>
    </main>
  )
}
