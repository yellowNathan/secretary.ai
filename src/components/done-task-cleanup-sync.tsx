import { useEffect } from "react"
import { apiFetch } from "@/lib/api-fetch"
import { t } from "@/lib/i18n"
import { toast } from "@/lib/toast"

// Checks only while a signed-in app is open. The server rechecks every
// condition atomically before deleting anything.
export function DoneTaskCleanupSync() {
  useEffect(() => {
    let stopped = false, running = false, failures = 0, reported = false
    let retry: number | undefined
    async function sweep() {
      if (stopped || running || !navigator.onLine) return
      running = true
      try {
        const response = await apiFetch("/api/task_cleanup_settings", { cache: "no-store" })
        if (!response.ok) throw new Error("settings")
        const rows = await response.json()
        if (!Array.isArray(rows)) throw new Error("settings")
        if (rows.length === 1 && Number.isInteger(rows[0].days) && rows[0].days > 0 && rows[0].days <= 3650 && !stopped) {
          const result = await apiFetch("/api/cleanup-done-tasks", { method: "POST" })
          if (!result.ok) throw new Error("cleanup")
          const data = await result.json() as { deleted?: number }
          if (data.deleted) window.dispatchEvent(new Event("done-tasks-cleaned"))
        }
        failures = 0; reported = false
      } catch {
        if (!stopped) {
          failures++
          if (failures >= 2 && !reported) { reported = true; toast.error(t("Couldn't check done task cleanup. The app will try again while it's open.")) }
          window.clearTimeout(retry)
          retry = window.setTimeout(() => void sweep(), failures === 1 ? 5000 : 60000)
        }
      } finally { running = false }
    }
    void sweep()
    const timer = window.setInterval(() => void sweep(), 5 * 60_000)
    const trigger = () => void sweep()
    const visible = () => { if (document.visibilityState === "visible") trigger() }
    window.addEventListener("online", trigger)
    window.addEventListener("task-cleanup-changed", trigger)
    document.addEventListener("visibilitychange", visible)
    return () => { stopped = true; clearInterval(timer); window.clearTimeout(retry); window.removeEventListener("online", trigger); window.removeEventListener("task-cleanup-changed", trigger); document.removeEventListener("visibilitychange", visible) }
  }, [])
  return null
}
