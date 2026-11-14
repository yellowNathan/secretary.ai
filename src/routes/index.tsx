import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { CalendarDays, Columns3, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// "/" — the landing page for visitors.
export const Route = createFileRoute("/")({
  component: Landing,
})

const features = [
  {
    icon: Columns3,
    title: "Your own columns",
    text: "Set up the stages your work moves through, from Backlog to Shipped.",
  },
  {
    icon: CalendarDays,
    title: "Dates that stand out",
    text: "Due dates are sorted for you, and overdue tasks are flagged in red.",
  },
  {
    icon: MessageSquare,
    title: "AI helper",
    text: "Ask the chat to break a goal into tasks or plan what to do next.",
  },
]

function Landing() {
  const navigate = useNavigate()
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-20">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Organise your work, neatly.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          A simple board for your tasks. Make the columns you need, add tasks with due dates,
          and keep everything in order.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" onClick={() => navigate({ to: "/signin" })}>
            Sign up or sign in
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate({ to: "/demo" })}>
            Try the demo
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="gap-2 p-5">
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          </Card>
        ))}
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/signin" className="underline underline-offset-4">Sign in</Link>
      </p>
    </main>
  )
}
