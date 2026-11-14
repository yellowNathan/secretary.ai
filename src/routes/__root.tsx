import { createRootRoute, Outlet } from "@tanstack/react-router"
import { VibesAuthProvider, useUser } from "@omg-dev/sdk"
import { AppNav } from "@/components/app-nav"
import { ProfileSync } from "@/components/profile-sync"
import { ReminderSettingsSync } from "@/components/reminder-settings-sync"
import { Toaster } from "@/lib/toast"
import { useT } from "@/lib/i18n"

// The shell every route renders inside. The nav and the auth provider stay
// mounted across navigations.
export const Route = createRootRoute({
  component: Shell,
})

function Shell() {
  const t = useT()
  return (
    // No automatic sign-in pop-up: people sign in only when they press the button.
    <VibesAuthProvider autoPrompt={false}>
      <SignedInOnly />
      <div className="min-h-svh overflow-x-clip bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          {t("Skip to content")}
        </a>
        <AppNav />
        <div id="main" className="fade-in">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </VibesAuthProvider>
  )
}

// Saves sign-up details and loads personal settings once someone is signed in.
function SignedInOnly() {
  const user = useUser()
  if (!user) return null
  return (
    <>
      <ProfileSync />
      <ReminderSettingsSync />
    </>
  )
}
