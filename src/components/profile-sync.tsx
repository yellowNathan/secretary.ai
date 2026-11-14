import { useEffect, useRef } from "react"
import { useCollection } from "@omg-dev/sdk"
import { clearPendingSignup, takePendingSignup } from "@/lib/auth"
import type { ProfileDetails } from "@/lib/tasks"
import { toast } from "@/lib/toast"
import { t } from "@/lib/i18n"

// Mounted only for signed-in people. When someone has just come back from
// signing up, save the details they typed into their profile.
export function ProfileSync() {
  const { data, loading, create, update } = useCollection<ProfileDetails>({ collection: "profiles", api: "/api/profiles" })
  const done = useRef(false)

  useEffect(() => {
    if (loading || done.current) return
    const pending = takePendingSignup()
    if (!pending) return
    done.current = true
    const existing = (data as ProfileDetails[])[0]
    const display_name = `${pending.first_name} ${pending.last_name}`.trim()
    const save = existing
      ? update(existing.id, { ...pending, display_name: existing.display_name || display_name })
      : create({
          ...pending,
          display_name,
          title: "",
          bio: "",
          avatar_color: "primary",
          avatar_key: "",
          start_page: "home",
        })
    Promise.resolve(save)
      .then(() => {
        clearPendingSignup()
        toast.success(t("Welcome, {name}!", { name: pending.first_name || display_name }))
      })
      .catch(() => {
        done.current = false
      })
  }, [data, loading, create, update])

  return null
}
