import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAuth, useUser } from "@omg-dev/sdk"
import { Bot, CalendarDays, Home, KanbanSquare, LogIn, LogOut, Menu, PlayCircle, Settings, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Brand } from "@/components/brand"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageMenu } from "@/components/language-menu"
import { useT } from "@/lib/i18n"

// Signed-in people get their workspace; visitors only see Home and the demo.
const memberLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/board", label: "Board", icon: KanbanSquare },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/chat", label: "Your secretary", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const
const visitorLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/demo", label: "Demo", icon: PlayCircle },
] as const

const linkBase =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
const linkActive = { className: "bg-accent text-foreground font-medium" }

export function AppNav() {
  const t = useT()
  const user = useUser()
  const { signOut, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const links = user ? memberLinks : visitorLinks

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Brand />

        <div className="flex items-center gap-1">
        {/* Desktop: links inline */}
        <nav aria-label={t("Main")} className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: true }}
              className={`${linkBase} min-h-10 gap-2 text-sm`}
              activeProps={linkActive}
            >
              {t(l.label)}
            </Link>
          ))}
          <ThemeToggle compact className="ml-2" />
          {user ? (
            <Button variant="ghost" className="ml-2 min-h-10" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" /> {t("Sign out")}
            </Button>
          ) : loading ? null : (
            <>
              <Link to="/signin" className="ml-2">
                <Button variant="ghost" className="min-h-10">
                  <LogIn className="size-4" aria-hidden="true" /> {t("Sign in")}
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="min-h-10">
                  <UserPlus className="size-4" aria-hidden="true" /> {t("Sign up")}
                </Button>
              </Link>
            </>
          )}
        </nav>

        <LanguageMenu />

        {/* Mobile: hamburger menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label={t("Open menu")}>
                <Menu className="size-6" aria-hidden="true" />
              </Button>
            }
          />
          <SheetContent side="right" className="w-72 p-4">
            <SheetHeader className="p-0 pb-2">
              <SheetTitle>{t("Menu")}</SheetTitle>
            </SheetHeader>
            <nav aria-label={t("Main")} className="flex flex-col gap-1">
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
                  {t(l.label)}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t("Appearance")}</p>
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
                  <LogOut className="size-4" aria-hidden="true" /> {t("Sign out")}
                </Button>
              ) : (
                <div className="grid gap-2">
                  <Link to="/signup" onClick={() => setOpen(false)}>
                    <Button className="h-11 w-full">
                      <UserPlus className="size-4" aria-hidden="true" /> {t("Sign up")}
                    </Button>
                  </Link>
                  <Link to="/signin" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="h-11 w-full">
                      <LogIn className="size-4" aria-hidden="true" /> {t("Sign in")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  )
}
