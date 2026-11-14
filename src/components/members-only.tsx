import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useAuth } from "@omg-dev/sdk"
import { Lock, LogIn, PlayCircle, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useT } from "@/lib/i18n"

// Pages with saved work are only for signed-in people. Visitors get a calm
// note with buttons instead of a pop-up, and can still try the demo.
export function MembersOnly({ children }: { children: ReactNode }) {
  const t = useT()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="mx-auto max-w-md space-y-3 px-4 py-12" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </main>
    )
  }
  if (user) return <>{children}</>

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{t("This page is for your account")}</h1>
        <p className="text-base text-muted-foreground">
          {t("Sign in to keep your tasks, reminders and calendar. Or try the demo first, no account needed.")}
        </p>
        <div className="grid w-full gap-2">
          <Link to="/signup">
            <Button className="h-11 w-full">
              <UserPlus className="size-4" aria-hidden="true" /> {t("Sign up")}
            </Button>
          </Link>
          <Link to="/signin">
            <Button variant="outline" className="h-11 w-full">
              <LogIn className="size-4" aria-hidden="true" /> {t("Sign in")}
            </Button>
          </Link>
          <Link to="/demo">
            <Button variant="ghost" className="h-11 w-full">
              <PlayCircle className="size-4" aria-hidden="true" /> {t("Try the demo")}
            </Button>
          </Link>
        </div>
      </Card>
    </main>
  )
}
