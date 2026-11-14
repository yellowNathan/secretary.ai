import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { ArrowLeft, History, Trash2 } from "lucide-react"
import { MembersOnly } from "@/components/members-only"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useT } from "@/lib/i18n"
import { botNames, readHistory, type BotId, type HistoryRow } from "@/lib/secretary"

export const Route = createFileRoute("/secretary-history")({ component: () => <MembersOnly><SecretaryHistory /></MembersOnly> })

function SecretaryHistory() {
  const t = useT()
  const history = useCollection<HistoryRow>({ collection: "secretary_history", api: "/api/secretary_history" })
  useEffect(() => {
    const reload = () => { void history.refresh() }
    window.addEventListener("secretary-history-pruned", reload)
    return () => window.removeEventListener("secretary-history-pruned", reload)
  }, [history.refresh])
  const [opened, setOpened] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState("")
  async function remove(row: HistoryRow) {
    if (!window.confirm(t("Delete this saved conversation?"))) return
    setDeleting(row.id); setError("")
    try { await history.remove(row.id); if (opened === row.id) setOpened(null) } catch { setError(t("Couldn't delete this conversation. Please try again.")) }
    finally { setDeleting(null) }
  }
  const rows = [...history.data].sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")))
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
    <header className="space-y-2"><Link to="/chat" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"><ArrowLeft className="size-4" />{t("Your secretary")}</Link><h1 className="text-3xl font-semibold">{t("Conversation history")}</h1><p className="text-muted-foreground">{t("Open a conversation to continue chatting. Earlier proposed changes cannot be replayed.")}</p></header>
    {(error || history.error) && <p role="alert" className="text-destructive">{error || t("Couldn't load your history.")}</p>}
    {history.loading ? <p>{t("Loading…")}</p> : !history.error && rows.length === 0 ? <Card className="items-center p-8 text-center"><History className="size-6 text-primary" /><p>{t("No saved conversations yet.")}</p><p className="text-sm text-muted-foreground">{t("You can choose whether to save history in personalisation settings.")}</p><Link to="/chat" className="text-primary underline">{t("Your secretary")}</Link></Card> : <div className="space-y-3">{rows.map((row) => <Card key={row.id} className="gap-3 p-4">
      <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{row.title}</h2><p className="text-sm text-muted-foreground">{t(botNames[row.bot as BotId] || "Assistant")}{row.created_at ? ` · ${new Date(row.created_at).toLocaleString()}` : ""}</p></div><Button type="button" variant="ghost" size="icon" aria-label={t("Delete conversation")} disabled={deleting === row.id} onClick={() => void remove(row)}><Trash2 className="size-4" /></Button></div>
      <div className="flex flex-wrap gap-2"><Link to="/chat" search={{ conversation: row.id }} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("Continue conversation")}</Link><Button type="button" variant="outline" size="sm" className="min-h-10 w-fit" aria-expanded={opened === row.id} onClick={() => setOpened(opened === row.id ? null : row.id)}>{opened === row.id ? t("Close conversation") : t("View conversation")}</Button></div>
      {opened === row.id && <div className="space-y-3 border-t border-border pt-3">{readHistory(row.messages).map((m, i) => <div key={i} className="rounded-lg bg-muted/60 p-3"><p className="mb-1 text-xs font-semibold text-muted-foreground">{m.role === "user" ? t("You") : t("Assistant")}</p><p className="whitespace-pre-wrap break-words text-sm">{m.text}</p></div>)}</div>}
    </Card>)}</div>}
  </main>
}
