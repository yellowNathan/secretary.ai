import { Link } from "@tanstack/react-router"

export function Brand() {
  return (
    <Link
      to="/"
      className="flex min-h-11 items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img src="/icon.svg" alt="" width={32} height={32} className="size-8 rounded-lg" />
      <span className="text-lg">
        secretary<span className="text-muted-foreground">.ai</span>
      </span>
    </Link>
  )
}
