import { Link } from "@tanstack/react-router"
import { useAuth, useUser } from "@omg-dev/sdk"
import { Button } from "@/components/ui/button"

const links = [
  { to: "/", label: "Home" },
  { to: "/board", label: "Board" },
  { to: "/calendar", label: "Calendar" },
  { to: "/chat", label: "AI chat" },
  { to: "/demo", label: "Demo" },
] as const

export function AppNav() {
  const user = useUser()
  const { signOut } = useAuth()
  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "bg-accent text-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        {user ? (
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        ) : (
          <Link
            to="/signin"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-foreground font-medium" }}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
