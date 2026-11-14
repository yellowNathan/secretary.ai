import { useEffect, useState } from "react"
import { CheckCircle2, CircleAlert, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Tiny confirmation toasts: toast.success("Saved") / toast.error("...").
type Item = { id: number; kind: "success" | "error"; text: string }
let items: Item[] = []
let nextId = 1
const listeners = new Set<(items: Item[]) => void>()

function push(kind: Item["kind"], text: string) {
  const id = nextId++
  items = [...items.slice(-2), { id, kind, text }]
  listeners.forEach((l) => l(items))
  setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3000)
}
function dismiss(id: number) {
  items = items.filter((i) => i.id !== id)
  listeners.forEach((l) => l(items))
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
}

export function Toaster() {
  const [list, setList] = useState<Item[]>(items)
  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn(
            "fade-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-base text-popover-foreground shadow-lg",
            t.kind === "error" ? "border-destructive/40" : "border-border",
          )}
        >
          {t.kind === "error" ? (
            <CircleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
