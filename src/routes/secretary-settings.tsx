import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { ArrowLeft, Save } from "lucide-react"
import { MembersOnly } from "@/components/members-only"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n"
import { botIds, botNames, defaultSecretarySettings, retentionValue, type SecretarySettings } from "@/lib/secretary"

export const Route = createFileRoute("/secretary-settings")({ component: () => <MembersOnly><SecretarySettingsPage /></MembersOnly> })
const selectClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function SecretarySettingsPage() {
  const t = useT()
  const settings = useCollection<SecretarySettings>({ collection: "secretary_settings", api: "/api/secretary_settings" })
  const [draft, setDraft] = useState<typeof defaultSecretarySettings | null>(null)
  const [customDays, setCustomDays] = useState("30")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState("")
  useEffect(() => {
    if (!settings.loading && !settings.error && draft === null) {
      const row = settings.data[0]
      const retention = retentionValue(row?.history_retention)
      setDraft(row ? { tone: row.tone || "friendly", length: row.length || "balanced", default_bot: row.default_bot || "general", instructions: row.instructions || "", history_retention: retention } : defaultSecretarySettings)
      if (/^\d+$/.test(retention)) setCustomDays(retention)
    }
  }, [settings.loading, settings.error, settings.data, draft])
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!draft || saving) return
    if (draft.history_retention === "custom" && (!/^\d+$/.test(customDays) || Number(customDays) < 1 || Number(customDays) > 3650)) { setResult(t("Enter a whole number of days between 1 and 3650.")); return }
    const payload = { ...draft, history_retention: draft.history_retention === "custom" ? String(Number(customDays)) : draft.history_retention }
    setSaving(true); setResult("")
    try {
      if (settings.data[0]) await settings.update(settings.data[0].id, payload)
      else await settings.create(payload)
      window.dispatchEvent(new Event("secretary-retention-changed"))
      setResult(t("Settings saved"))
    } catch { setResult(t("Couldn't save your settings. Please try again.")) }
    finally { setSaving(false) }
  }
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
    <header className="space-y-2"><Link to="/chat" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"><ArrowLeft className="size-4" />{t("Your secretary")}</Link><h1 className="text-3xl font-semibold">{t("Secretary settings")}</h1><p className="text-muted-foreground">{t("Personalise how your secretary responds.")}</p></header>
    {settings.error ? <p role="alert">{t("Couldn't load your settings.")}</p> : !draft ? <p>{t("Loading…")}</p> : <form onSubmit={save}><Card className="gap-5 p-4 sm:p-5">
      <div className="space-y-2"><label htmlFor="default-bot" className="font-medium">{t("Default assistant")}</label><select id="default-bot" className={selectClass} value={draft.default_bot} onChange={(e) => setDraft({ ...draft, default_bot: e.target.value })}>{botIds.map((id) => <option key={id} value={id}>{t(botNames[id])}</option>)}</select><p className="text-sm text-muted-foreground">{t("Used when you open Your secretary.")}</p></div>
      <div className="space-y-2"><label htmlFor="tone" className="font-medium">{t("Tone")}</label><select id="tone" className={selectClass} value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value })}><option value="friendly">{t("Friendly")}</option><option value="professional">{t("Professional")}</option><option value="direct">{t("Direct")}</option></select></div>
      <div className="space-y-2"><label htmlFor="length" className="font-medium">{t("Response length")}</label><select id="length" className={selectClass} value={draft.length} onChange={(e) => setDraft({ ...draft, length: e.target.value })}><option value="concise">{t("Concise")}</option><option value="balanced">{t("Balanced")}</option><option value="detailed">{t("Detailed")}</option></select></div>
      <div className="space-y-2"><label htmlFor="instructions" className="font-medium">{t("Additional preferences")}</label><Textarea id="instructions" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} maxLength={1000} rows={4} placeholder={t("For example, use bullet points and call me Sam.")} /><p className="text-sm text-muted-foreground">{t("These preferences are sent to AI with your messages. Avoid sensitive information.")}</p></div>
      <div className="space-y-2 border-t border-border pt-4"><label htmlFor="history-retention" className="font-medium">{t("Conversation history")}</label><select id="history-retention" className={selectClass} value={["off", "forever", "7", "30", "90", "365"].includes(draft.history_retention) ? draft.history_retention : "custom"} onChange={(e) => setDraft({ ...draft, history_retention: e.target.value })}><option value="forever">{t("Keep until I delete it")}</option><option value="off">{t("Don't save new conversations")}</option><option value="7">{t("Delete after 7 days")}</option><option value="30">{t("Delete after 30 days")}</option><option value="90">{t("Delete after 90 days")}</option><option value="365">{t("Delete after 1 year")}</option><option value="custom">{t("Custom number of days")}</option></select>
        {!['off', 'forever', '7', '30', '90', '365'].includes(draft.history_retention) && <div className="space-y-1"><label htmlFor="history-days" className="text-sm">{t("Days after last activity")}</label><Input id="history-days" type="number" min={1} max={3650} step={1} required value={customDays} onChange={(e) => { setCustomDays(e.target.value); setDraft({ ...draft, history_retention: "custom" }) }} /></div>}
        <p className="text-sm text-muted-foreground">{t("Timed deletion applies to saved conversations after their last activity. Expired history is deleted when you next open the app while signed in; it is not deleted on a schedule.")}</p><p className="text-sm text-muted-foreground">{t("Turning saving off stops new messages being saved, including follow-ups to existing conversations. Existing history stays until you delete it or choose a retention period.")}</p>
      </div>
      {result && <p role="status">{result}</p>}<Button type="submit" className="h-11" disabled={saving}><Save className="size-4" />{saving ? t("Saving…") : t("Save settings")}</Button>
    </Card></form>}
  </main>
}
