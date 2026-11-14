import { createRootRoute, Outlet } from "@tanstack/react-router"
import { VibesAuthProvider } from "@omg-dev/sdk"
import { AppNav } from "@/components/app-nav"
import { Toaster } from "@/lib/toast"

// The shell every route renders inside. The nav and the auth provider stay
// mounted across navigations.
export const Route = createRootRoute({
  component: () => (
    <VibesAuthProvider>
      <div className="min-h-svh overflow-x-hidden bg-background text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <AppNav />
        <div id="main" className="fade-in">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </VibesAuthProvider>
  ),
})
