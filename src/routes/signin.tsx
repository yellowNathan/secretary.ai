import { createFileRoute } from "@tanstack/react-router"
import { VibesLogin, useUser } from "@omg-dev/sdk"
import { Card } from "@/components/ui/card"

export const Route = createFileRoute("/signin")({ component: SignIn })

function SignIn() {
  const user = useUser()
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to keep your work saved to your account.
        </p>
      </header>
      <Card className="p-5">
        {user ? (
          <p className="text-sm">
            Signed in as <span className="font-medium">{user.name ?? user.email}</span>.
          </p>
        ) : (
          <VibesLogin title="Sign in to continue" />
        )}
      </Card>
    </main>
  )
}
