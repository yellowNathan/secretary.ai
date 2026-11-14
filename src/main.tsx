import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { routeTree } from './routeTree.gen'

// Routes are files: add src/routes/pricing.tsx and you have /pricing. The
// route tree below is generated from that directory by @tanstack/router-plugin
// (see vite.config.ts) — never edit routeTree.gen.ts by hand.
const router = createRouter({ routeTree, scrollRestoration: true })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
