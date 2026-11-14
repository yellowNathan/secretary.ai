import { useEffect, useState } from "react"
import { Cloud, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n"

type Props = { loading: boolean; error: unknown; refresh: () => Promise<unknown> }

// Account collections are the source of truth. Refresh explicitly pulls their
// latest values; it does not queue edits made offline or import demo data.
export function AccountSync({ loading, error, refresh }: Props) {
  const t = useT()
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update); window.addEventListener("offline", update)
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update) }
  }, [])
  async function runRefresh() {
    if (refreshing) return
    setRefreshing(true); setRefreshError(false)
    try { await refresh() } catch { setRefreshError(true) }
    finally { setRefreshing(false) }
  }
  return <section aria-label={t("Account sync")} className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:flex-row sm:items-center">
    {online ? <Cloud className="size-5 shrink-0 text-primary" aria-hidden="true" /> : <WifiOff className="size-5 shrink-0 text-destructive" aria-hidden="true" />}
    <div className="min-w-0 w-full flex-1"><p className="font-medium">{t("Account sync")}</p><p role={error || refreshError || !online ? "alert" : "status"} className={error || refreshError || !online ? "text-destructive" : "text-muted-foreground"}>
      {!online ? t("You appear to be offline. Reconnect before saving; offline edits are not queued.") : error || refreshError ? t("Couldn't load account data. Check your connection and try refreshing.") : loading || refreshing ? t("Loading account data…") : t("Board and calendar changes are saved to your account. Refresh to load changes from another device.")}
    </p></div>
    <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={() => void runRefresh()} disabled={!online || refreshing || loading}><RefreshCw className="size-4" aria-hidden="true" />{t("Refresh account data")}</Button>
  </section>
}
