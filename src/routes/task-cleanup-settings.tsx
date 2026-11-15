import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { MembersOnly } from "@/components/members-only"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useT } from "@/lib/i18n"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/task-cleanup-settings")({ component: () => <MembersOnly><TaskCleanupSettings /></MembersOnly> })
type Cleanup = { id: string; days: number; enabled_at: string }

function TaskCleanupSettings() {
  const t = useT()
  const settings = useCollection<Cleanup>({ collection: "task_cleanup_settings", api: "/api/task_cleanup_settings" })
  const [choice, setChoice] = useState<string | null>(null)
  const [custom, setCustom] = useState("30")
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!settings.loading && !settings.error && choice === null) {
      const days = settings.data[0]?.days || 0
      setChoice([0, 7, 30, 90, 365].includes(days) ? String(days) : "custom")
      if (days > 0) setCustom(String(days))
    }
  }, [settings.loading, settings.error, settings.data, choice])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const days = choice === "custom" ? Number(custom) : Number(choice)
    if (!Number.isInteger(days) || days < 0 || days > 3650 || (choice === "custom" && days < 1)) { toast.error(t("Enter a whole number of days between 1 and 3650.")); return }
    if (settings.data.length > 1) { toast.error(t("Couldn't save your settings. Please try again.")); return }
    if (days > 0 && !window.confirm(t("Completed tasks will be permanently deleted after the selected period. Continue?"))) return
    setSaving(true)
    try {
      const payload = { days, enabled_at: new Date().toISOString() }
      if (settings.data[0]) await settings.update(settings.data[0].id, payload)
      else await settings.create(payload)
      window.dispatchEvent(new Event("task-cleanup-changed"))
      toast.success(t("Settings saved"))
    } catch { toast.error(t("Couldn't save your settings. Please try again.")) }
    finally { setSaving(false) }
  }
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
    <header className="space-y-2"><Link to="/settings" className="text-sm text-primary">← {t("Settings")}</Link><h1 className="text-3xl font-semibold">{t("Done task cleanup")}</h1><p className="text-muted-foreground">{t("Choose when completed tasks are automatically deleted.")}</p></header>
    {settings.error ? <p role="alert">{t("Couldn't load your settings.")}</p> : choice === null ? <p>{t("Loading…")}</p> : <form onSubmit={save}><Card className="space-y-4 p-5">
      <div className="space-y-2"><label htmlFor="cleanup-days" className="font-medium">{t("Automatically delete tasks in done columns")}</label><select id="cleanup-days" className="h-11 w-full rounded-lg border border-input bg-background px-3" value={choice} onChange={(e) => setChoice(e.target.value)}><option value="0">{t("Off — keep tasks")}</option><option value="7">{t("After 7 days")}</option><option value="30">{t("After 30 days")}</option><option value="90">{t("After 90 days")}</option><option value="365">{t("After 1 year")}</option><option value="custom">{t("Custom number of days")}</option></select></div>
      {choice === "custom" && <div className="space-y-2"><label htmlFor="custom-cleanup">{t("Number of days")}</label><Input id="custom-cleanup" type="number" min={1} max={3650} step={1} required value={custom} onChange={(e) => setCustom(e.target.value)} /></div>}
      <p className="text-sm text-muted-foreground">{t("Deletion is permanent. The countdown starts from the latest task or column change, or when you save this setting, whichever is later. Existing completed tasks get the full period. The app checks while you are signed in and it is open; deletion is not scheduled in the background.")}</p>
      <p className="text-sm text-muted-foreground">{t("Attached files are not deleted from storage when a task is deleted.")}</p>
      <Button type="submit" disabled={saving}>{saving ? t("Saving…") : t("Save settings")}</Button>
    </Card></form>}
  </main>
}
