import { Link } from "@tanstack/react-router"
import { CalendarCheck } from "lucide-react"

export function Brand() {
  return (
    <Link
      to="/"
      className="flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <CalendarCheck className="size-4" aria-hidden="true" />
      </span>
      <span className="text-lg">
        secretary<span className="text-muted-foreground">.ai</span>
      </span>
    </Link>
  )
}
