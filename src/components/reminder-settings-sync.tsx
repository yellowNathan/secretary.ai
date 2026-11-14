import { useEffect } from "react"
import { useCollection } from "@omg-dev/sdk"
import { defaultReminderSettings, parseReminderSettings, setReminderSettings } from "@/lib/reminder-settings"

export type Preferences = { id: string; reminders: string }

// Loads a signed-in person's reminder settings so every reminder in the app
// follows them. Signing out puts the defaults back.
export function ReminderSettingsSync() {
  const { data } = useCollection<Preferences>({ collection: "preferences", api: "/api/preferences" })
  const json = data[0]?.reminders

  useEffect(() => {
    if (json != null) setReminderSettings(parseReminderSettings(json))
  }, [json])

  useEffect(() => () => setReminderSettings(defaultReminderSettings), [])

  return null
}
