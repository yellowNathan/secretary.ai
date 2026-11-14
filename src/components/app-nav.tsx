import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAuth, useUser } from "@omg-dev/sdk"
import { Bot, CalendarDays, Home, KanbanSquare, LogIn, LogOut, Menu, PlayCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Brand } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/board", label: "Board", icon: KanbanSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/chat", label: "AI chat", icon: Bot },
  { to: "/demo", label: "Demo", icon: PlayCircle },
] as const

const linkBase =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
const linkActive = { className: "bg-accent text-foreground font-medium" }

export function AppNav() {
  const user = useUser()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  // Signed-in people don't need the Demo link in the desktop bar.
  const desktopLinks = links.filter((l) => !(user && l.to === "/demo"))

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand />

        {/* Desktop: links inline */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {desktopLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className={`${linkBase} min-h-10 gap-2 text-sm`}
              activeProps={linkActive}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle compact className="ml-2" />
          {user ? (
            <Button variant="ghost" className="ml-2 min-h-10" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </Button>
          ) : (
            <Link to="/signin" className="ml-2">
              <Button className="min-h-10">
                <LogIn className="size-4" aria-hidden="true" /> Sign in
              </Button>
            </Link>
          )}
        </nav>

        {/* Mobile: hamburger menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Open menu">
                <Menu className="size-6" aria-hidden="true" />
              </Button>
            }
          />
          <SheetContent side="right" className="w-72 p-4">
            <SheetHeader className="p-0 pb-2">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Main" className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  activeOptions={{ exact: true }}
                  className={linkBase}
                  activeProps={linkActive}
                  onClick={() => setOpen(false)}
                >
                  <l.icon className="size-5" aria-hidden="true" />
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Appearance</p>
                <ThemeToggle />
              </div>
              {user ? (
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => {
                    setOpen(false)
                    void signOut()
                  }}
                >
                  <LogOut className="size-4" aria-hidden="true" /> Sign out
                </Button>
              ) : (
                <Link to="/signin" onClick={() => setOpen(false)}>
                  <Button className="h-11 w-full">
                    <LogIn className="size-4" aria-hidden="true" /> Sign in
                  </Button>
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
