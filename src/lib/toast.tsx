import { useEffect, useState } from "react"
import { BellRing, CheckCircle2, CircleAlert, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Tiny confirmation toasts: toast.success("Saved") / toast.error("...").
// Reminders use toast.urgent / toast.info / toast.quiet.
type Kind = "success" | "error" | "urgent" | "info" | "quiet"
type Item = { id: number; kind: Kind; text: string }
let items: Item[] = []
let nextId = 1
const listeners = new Set<(items: Item[]) => void>()

// How long each kind stays on screen; null = until dismissed.
const lifetime: Record<Kind, number | null> = {
  success: 3000,
  error: 6000,
  urgent: null,
  info: 6000,
  quiet: 3000,
}

function push(kind: Kind, text: string) {
  const id = nextId++
  items = [...items.slice(-3), { id, kind, text }]
  listeners.forEach((l) => l(items))
  const ms = lifetime[kind]
  if (ms != null) setTimeout(() => dismiss(id), ms)
}
function dismiss(id: number) {
  items = items.filter((i) => i.id !== id)
  listeners.forEach((l) => l(items))
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text),
  /** Stays until dismissed. */
  urgent: (text: string) => push("urgent", text),
  info: (text: string) => push("info", text),
  quiet: (text: string) => push("quiet", text),
}

const styles: Record<Kind, { box: string; icon: React.ReactNode }> = {
  success: { box: "border-border", icon: <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" /> },
  error: { box: "border-destructive/40", icon: <CircleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" /> },
  urgent: {
    box: "border-2 border-destructive font-medium shadow-xl",
    icon: <BellRing className="size-5 shrink-0 text-destructive" aria-hidden="true" />,
  },
  info: { box: "border-primary/40", icon: <BellRing className="size-5 shrink-0 text-primary" aria-hidden="true" /> },
  quiet: { box: "border-border text-muted-foreground", icon: <Info className="size-5 shrink-0" aria-hidden="true" /> },
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
          role={t.kind === "error" || t.kind === "urgent" ? "alert" : "status"}
          className={cn(
            "fade-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-popover px-4 py-3 text-base text-popover-foreground shadow-lg",
            styles[t.kind].box,
          )}
        >
          {styles[t.kind].icon}
          <span className="flex-1">{t.text}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
