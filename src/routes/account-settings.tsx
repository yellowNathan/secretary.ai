import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useAuth, useCollection } from "@omg-dev/sdk"
import { KeyRound, ShieldCheck } from "lucide-react"
import { MembersOnly } from "@/components/members-only"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProfileDetails } from "@/lib/tasks"
import { toast } from "@/lib/toast"
import { useT } from "@/lib/i18n"

export const Route = createFileRoute("/account-settings")({ component: () => <MembersOnly><AccountSettings /></MembersOnly> })

type Form = { first_name: string; last_name: string; username: string; phone: string }

function AccountSettings() {
  const t = useT()
  const { user } = useAuth()
  const profiles = useCollection<ProfileDetails>({ collection: "profiles", api: "/api/profiles" })
  const row = profiles.data[0]
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!profiles.loading && !profiles.error && form === null) setForm({ first_name: row?.first_name || "", last_name: row?.last_name || "", username: row?.username || "", phone: row?.phone || "" })
  }, [profiles.loading, profiles.error, row, form])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form || saving) return
    const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Form
    if (clean.username && !/^[a-zA-Z0-9_.]{3,30}$/.test(clean.username)) { toast.error(t("3 to 30 letters, numbers, dots or underscores.")); return }
    if (clean.phone && !/^\+?[0-9 ()-]{6,20}$/.test(clean.phone)) { toast.error(t("Enter a valid phone number, or leave it empty.")); return }
    setSaving(true)
    try {
      const display_name = `${clean.first_name} ${clean.last_name}`.trim()
      if (row) await profiles.update(row.id, { ...clean, display_name })
      else await profiles.create({ ...clean, display_name, email: String(user?.email || ""), title: "", bio: "", avatar_color: "primary", avatar_key: "", start_page: "home" })
      setForm(clean)
      toast.success(t("Account details saved"))
    } catch {
      toast.error(t("Couldn't save your account details. Please try again."))
    } finally { setSaving(false) }
  }

  const field = (key: keyof Form, label: string, autoComplete: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} autoComplete={autoComplete} className="h-11 text-base" value={form?.[key] ?? ""} onChange={(e) => setForm((f) => f && ({ ...f, [key]: e.target.value }))} />
    </div>
  )
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <Link to="/settings" className="text-sm text-primary underline-offset-4 hover:underline">← {t("Settings")}</Link>
        <h1 className="text-3xl font-semibold tracking-tight">{t("Account details")}</h1>
        <p className="text-base text-muted-foreground">{t("Edit your profile and view sign-in options.")}</p>
      </header>
      {profiles.error ? <Card className="gap-3 p-4" role="alert"><p>{t("Couldn't load your account details.")}</p><Button variant="outline" onClick={() => void profiles.refresh()}>{t("Try again")}</Button></Card> : !form ? <Skeleton className="h-64 w-full" /> : (
        <Card className="gap-4 p-4 sm:p-5">
          <h2 className="text-xl font-semibold">{t("Profile")}</h2>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">{field("first_name", t("First name"), "given-name")}{field("last_name", t("Last name"), "family-name")}</div>
            {field("username", t("Username"), "username")}
            {field("phone", t("Phone number (optional)"), "tel", "tel")}
            <div className="grid gap-1.5"><span className="text-sm font-medium">{t("Sign-in email")}</span><p className="break-all text-base">{user?.email || t("Not available")}</p><p className="text-sm text-muted-foreground">{t("Your sign-in email is managed by the sign-in provider.")}</p></div>
            <Button type="submit" className="h-11 w-full sm:w-auto sm:justify-self-end" disabled={saving}>{saving ? t("Saving…") : t("Save changes")}</Button>
          </form>
        </Card>
      )}
      <Card className="gap-3 p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5 text-primary" aria-hidden="true" />{t("Sign-in methods")}</h2>
        <p className="text-base text-muted-foreground">{t("Google and Apple account linking is not currently available in this app.")}</p>
        <p className="flex items-start gap-2 text-base text-muted-foreground"><KeyRound className="mt-1 size-5 shrink-0" aria-hidden="true" />{t("Adding or managing passkeys is not currently available in this app.")}</p>
      </Card>
    </main>
  )
}
