import { createFileRoute, Link } from "@tanstack/react-router"
import { useUser } from "@omg-dev/sdk"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmailButton, FallbackSignIn, OrDivider, ProviderButtons, SecureNote, useSignInAction } from "@/components/auth-options"
import { useT } from "@/lib/i18n"

export const Route = createFileRoute("/signin")({ component: SignIn })

// "/signin" — only shown when someone presses Sign in.
function SignIn() {
  const t = useT()
  const user = useUser()
  const { start, showFallback } = useSignInAction("/")

  if (user) return <AlreadySignedIn name={String(user.name || user.email || "")} />

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src="/icon.svg" alt="" className="size-14 rounded-2xl" />
        <h1 className="text-3xl font-semibold tracking-tight">{t("Welcome back")}</h1>
        <p className="text-base text-muted-foreground">{t("Sign in to see your tasks, reminders and calendar.")}</p>
      </header>
      <Card className="gap-4 p-5">
        <ProviderButtons mode="signin" onStart={start} />
        <OrDivider />
        <EmailButton onStart={start} />
        {showFallback && <FallbackSignIn />}
        <SecureNote />
        <p className="text-sm text-muted-foreground">{t("Passkey sign-in is not currently available in this app.")}</p>
      </Card>
      <p className="text-center text-base">
        {t("New here?")}{" "}
        <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("Create an account")}
        </Link>
      </p>
    </main>
  )
}

export function AlreadySignedIn({ name }: { name: string }) {
  const t = useT()
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t("You're signed in")}</h1>
      <p className="text-base text-muted-foreground">{t("Signed in as {name}.", { name })}</p>
      <Link to="/">
        <Button className="h-11 w-full">
          <Home className="size-4" aria-hidden="true" /> {t("Go to my home")}
        </Button>
      </Link>
    </main>
  )
}
