import { createFileRoute } from "@tanstack/react-router"
import App from "@/App"

// "/board" — the work organiser itself.
export const Route = createFileRoute("/board")({
  component: App,
})
