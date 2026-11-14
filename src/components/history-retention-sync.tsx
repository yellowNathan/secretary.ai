import { useEffect } from "react"
import { historyExpired, retentionValue, type HistoryRow, type SecretarySettings } from "@/lib/secretary"
import { t } from "@/lib/i18n"
import { toast } from "@/lib/toast"
import { apiFetch } from "@/lib/api-fetch"

// This runs only while a signed-in app is open. There is no background scheduler.
export function HistoryRetentionSync() {
  useEffect(() => {
    let stopped = false
    let running = false
    let reported = false
    let failures = 0
    let retryTimer: number | undefined
    async function sweep() {
      if (running || stopped || !navigator.onLine) return
      running = true
      let phase: "check" | "delete" = "check"
      try {
        const settingsResponse = await apiFetch("/api/secretary_settings", { cache: "no-store" })
        if (!settingsResponse.ok) throw new Error("settings")
        const settings = await settingsResponse.json() as SecretarySettings[]
        if (!Array.isArray(settings)) throw new Error("settings")
        const retention = retentionValue(settings[0]?.history_retention)
        if (retention === "forever" || retention === "off" || stopped) {
          failures = 0
          reported = false
          return
        }
        const response = await apiFetch("/api/secretary_history", { cache: "no-store" })
        if (!response.ok) throw new Error("history")
        const rows = await response.json() as HistoryRow[]
        if (!Array.isArray(rows)) throw new Error("history")
        for (const row of rows) {
          if (stopped) break
          if (!historyExpired(row, retention)) continue
          // Re-read both settings and row before deleting, to avoid acting on an
          // old list after another tab continued the conversation or changed policy.
          const [currentSettings, currentRow] = await Promise.all([
            apiFetch("/api/secretary_settings", { cache: "no-store" }),
            apiFetch(`/api/secretary_history/${encodeURIComponent(row.id)}`, { cache: "no-store" }),
          ])
          if (currentRow.status === 404) continue
          if (!currentSettings.ok || !currentRow.ok) throw new Error("refresh")
          const freshSettings = await currentSettings.json() as SecretarySettings[]
          const freshRow = await currentRow.json() as HistoryRow
          if (!Array.isArray(freshSettings) || !freshRow?.id) throw new Error("refresh")
          if (stopped) break
          if (!historyExpired(freshRow, retentionValue(freshSettings[0]?.history_retention))) continue
          phase = "delete"
          const deleted = await apiFetch(`/api/secretary_history/${encodeURIComponent(row.id)}`, { method: "DELETE" })
          if (!deleted.ok && deleted.status !== 404) throw new Error("delete")
          window.dispatchEvent(new Event("secretary-history-pruned"))
          phase = "check"
        }
        failures = 0
        reported = false
      } catch {
        if (!stopped) {
          failures += 1
          // Authentication and connectivity can briefly be unavailable at launch.
          // Retry before showing a warning and keep retrying while the app is open.
          if (failures >= 2 && !reported) {
            reported = true
            toast.error(t(phase === "delete"
              ? "Couldn't delete an expired conversation. The app will try again while it's open."
              : "Couldn't check conversation history retention. The app will try again while it's open."))
          }
          window.clearTimeout(retryTimer)
          retryTimer = window.setTimeout(() => void sweep(), failures === 1 ? 5000 : 60000)
        }
      } finally { running = false }
    }
    void sweep()
    const timer = window.setInterval(() => void sweep(), 5 * 60 * 1000)
    const online = () => void sweep()
    const visible = () => { if (document.visibilityState === "visible") void sweep() }
    window.addEventListener("online", online)
    window.addEventListener("secretary-retention-changed", online)
    document.addEventListener("visibilitychange", visible)
    return () => { stopped = true; clearInterval(timer); window.clearTimeout(retryTimer); window.removeEventListener("online", online); window.removeEventListener("secretary-retention-changed", online); document.removeEventListener("visibilitychange", visible) }
  }, [])
  return null
}
