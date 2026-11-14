import { useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useUser } from "@omg-dev/sdk"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FallbackSignIn, OrDivider, ProviderButtons, SecureNote, useSignInAction } from "@/components/auth-options"
import { savePendingSignup, type SignupDetails } from "@/lib/auth"
import { useT } from "@/lib/i18n"
import { AlreadySignedIn } from "./signin"

export const Route = createFileRoute("/signup")({ component: SignUp })

const empty: SignupDetails = { first_name: "", last_name: "", username: "", phone: "", email: "" }

// "/signup" — Google, Apple, or the details form. Details are saved to the
// profile once the emailed code is confirmed (see <ProfileSync>).
function SignUp() {
  const t = useT()
  const user = useUser()
  const { start, showFallback } = useSignInAction("/")
  const [form, setForm] = useState<SignupDetails>(empty)
  const [errors, setErrors] = useState<Partial<Record<keyof SignupDetails, string>>>({})

  if (user) return <AlreadySignedIn name={String(user.name || user.email || "")} />

  function set<K extends keyof SignupDetails>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate() {
    const e: Partial<Record<keyof SignupDetails, string>> = {}
    if (!form.first_name.trim()) e.first_name = t("Enter your first name.")
    if (!form.last_name.trim()) e.last_name = t("Enter your last name.")
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(form.username.trim()))
      e.username = t("3 to 30 letters, numbers, dots or underscores.")
    if (form.phone.trim() && !/^\+?[0-9 ()-]{6,20}$/.test(form.phone.trim())) e.phone = t("Enter a valid phone number, or leave it empty.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = t("Enter a valid email address.")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as SignupDetails
    savePendingSignup(clean)
    start()
  }

  const field = (k: keyof SignupDetails, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`su-${k}`} className="text-sm font-medium">{label}</Label>
      <Input
        id={`su-${k}`}
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `su-${k}-err` : undefined}
        className="h-11 text-base"
        {...props}
      />
      {errors[k] && <p id={`su-${k}-err`} className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  )

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src="/icon.svg" alt="" className="size-14 rounded-2xl" />
        <h1 className="text-3xl font-semibold tracking-tight">{t("Create your account")}</h1>
        <p className="text-base text-muted-foreground">{t("Save your tasks, reminders and calendar on every device.")}</p>
      </header>
      <Card className="gap-4 p-5">
        <ProviderButtons mode="signup" onStart={start} />
        <OrDivider />
        <form onSubmit={submit} noValidate className="grid gap-4" aria-label={t("Sign up with email")}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("first_name", t("First name"), { autoComplete: "given-name" })}
            {field("last_name", t("Last name"), { autoComplete: "family-name" })}
          </div>
          {field("username", t("Username"), { autoComplete: "username", autoCapitalize: "none" })}
          {field("phone", t("Phone number (optional)"), { type: "tel", autoComplete: "tel", inputMode: "tel" })}
          {field("email", t("Email"), { type: "email", autoComplete: "email", inputMode: "email" })}
          <Button type="submit" className="h-12 w-full gap-2 text-base">
            <UserPlus className="size-5" aria-hidden="true" /> {t("Create account")}
          </Button>
        </form>
        {showFallback && <FallbackSignIn />}
        <SecureNote />
      </Card>
      <p className="text-center text-base">
        {t("Already have an account?")}{" "}
        <Link to="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </main>
  )
}
