import { createFileRoute } from "@tanstack/react-router"
import App from "@/App"
import { MembersOnly } from "@/components/members-only"

// "/board" — the work organiser itself (signed-in people only).
export const Route = createFileRoute("/board")({
  component: () => (
    <MembersOnly>
      <App />
    </MembersOnly>
  ),
})
