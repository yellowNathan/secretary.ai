import { useEffect, useRef } from "react"

// Refresh the currently visible collection after the server removes tasks.
export function useCleanupRefresh(refresh: () => Promise<unknown>) {
  const current = useRef(refresh)
  current.current = refresh
  useEffect(() => {
    const handle = () => { void current.current().catch(() => {}) }
    window.addEventListener("done-tasks-cleaned", handle)
    return () => window.removeEventListener("done-tasks-cleaned", handle)
  }, [])
}
