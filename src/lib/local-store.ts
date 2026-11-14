import { useCallback, useEffect, useState } from "react"

// A tiny stand-in for useCollection that keeps rows in this browser only.
// The demo uses it so visitors can try everything without an account.

export type Store<T extends { id: string }> = {
  data: T[]
  loading: boolean
  error: string | null
  create: (item: Partial<T>) => Promise<T>
  update: (id: string, patch: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}

function read<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useLocalCollection<T extends { id: string }>(key: string, seed: () => T[]): Store<T> & { reset: () => void } {
  const [data, setData] = useState<T[]>(() => read<T>(key) ?? seed())

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // Storage full or blocked: the demo still works for this visit.
    }
  }, [key, data])

  const create = useCallback(async (item: Partial<T>) => {
    const now = new Date().toISOString()
    const row = { ...item, id: newId(), created_at: now, updated_at: now } as unknown as T
    setData((d) => [...d, row])
    return row
  }, [])

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    let updated: T | undefined
    setData((d) =>
      d.map((r) => {
        if (r.id !== id) return r
        updated = { ...r, ...patch, updated_at: new Date().toISOString() }
        return updated
      }),
    )
    return (updated ?? ({ id, ...patch } as T))
  }, [])

  const remove = useCallback(async (id: string) => {
    setData((d) => d.filter((r) => r.id !== id))
  }, [])

  const reset = useCallback(() => setData(seed()), [seed])

  return { data, loading: false, error: null, create, update, remove, reset }
}
