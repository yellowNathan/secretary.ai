import { createFileRoute } from "@tanstack/react-router"
import { MembersOnly } from "@/components/members-only"
import { ReminderSettingsPage } from "@/routes/settings"

export const Route = createFileRoute("/reminder-settings")({ component: () => <MembersOnly><ReminderSettingsPage /></MembersOnly> })
