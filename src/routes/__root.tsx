import { createRootRoute, Outlet } from "@tanstack/react-router"
import { VibesAuthProvider } from "@omg-dev/sdk"
import { AppNav } from "@/components/app-nav"

// The shell every route renders inside. The nav and the auth provider stay
// mounted across navigations.
export const Route = createRootRoute({
  component: () => (
    <VibesAuthProvider>
      <div className="min-h-svh bg-background text-foreground">
        <AppNav />
        <Outlet />
      </div>
    </VibesAuthProvider>
  ),
})
