import { useState } from "react"
import { VibesLogin } from "@omg-dev/sdk"
import { Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { canUseHostedSignIn, goToSignIn } from "@/lib/auth"
import { useT } from "@/lib/i18n"

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5.1c.7-.9 1.2-2 1.1-3.1-1 0-2.3.7-3 1.6-.7.8-1.2 1.9-1.1 3 1.1.1 2.3-.6 3-1.5z" />
    </svg>
  )
}

/** Opens the secure sign-in page, or shows the built-in code form where that page can't return here. */
export function useSignInAction(returnPath = "/") {
  const [showFallback, setShowFallback] = useState(false)
  function start() {
    if (canUseHostedSignIn()) goToSignIn(returnPath)
    else setShowFallback(true)
  }
  return { start, showFallback }
}

export function FallbackSignIn() {
  const t = useT()
  return (
    <div className="fade-in rounded-xl border border-border p-2">
      <VibesLogin title={t("Confirm your email")} subtitle={t("We'll email you a 6-digit code.")} />
    </div>
  )
}

/** Google and Apple buttons. `mode` only changes the wording. */
export function ProviderButtons({ mode, onStart }: { mode: "signin" | "signup"; onStart: () => void }) {
  const t = useT()
  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" className="h-12 w-full gap-3 text-base" onClick={onStart}>
        <GoogleLogo /> {t(mode === "signin" ? "Continue with Google" : "Sign up with Google")}
      </Button>
      <Button type="button" variant="outline" className="h-12 w-full gap-3 text-base" onClick={onStart}>
        <AppleLogo /> {t(mode === "signin" ? "Continue with Apple" : "Sign up with Apple")}
      </Button>
    </div>
  )
}

export function OrDivider() {
  const t = useT()
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" role="separator">
      <span className="h-px flex-1 bg-border" />
      {t("or")}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

export function EmailButton({ onStart }: { onStart: () => void }) {
  const t = useT()
  return (
    <Button type="button" className="h-12 w-full gap-3 text-base" onClick={onStart}>
      <Mail className="size-5" aria-hidden="true" /> {t("Continue with email")}
    </Button>
  )
}

export function SecureNote() {
  const t = useT()
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      {t("No password to remember or leak: we email you a one-time code. Sign-in is handled securely by omg.dev.")}
    </p>
  )
}
