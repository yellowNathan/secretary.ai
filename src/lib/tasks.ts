export type Priority = "low" | "medium" | "high"
export type Task = {
  id: string
  title: string
  project: string
  /** id of the column the task sits in */
  status: string
  priority: Priority
  due: string
  notes: string
  /** days before the due date to remind; -1 or missing means no reminder */
  remind_days?: number | null
}
export type Column = { id: string; name: string; position: number; done: boolean }
export type CalendarEvent = {
  id: string
  title: string
  date: string
  time: string
  notes: string
  remind_days?: number | null
  repeat?: string | null
  repeat_until?: string | null
}
export type Attachment = {
  id: string
  task: string
  name: string
  key: string
  size: number
  converted_from?: string | null
}

export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly"

export type AutomationTrigger = "file_uploaded" | "task_created" | "task_done" | "schedule"
export type AutomationAction = "convert_file" | "set_reminder" | "set_priority" | "create_task" | "notify"
export type Automation = {
  id: string
  name: string
  trigger: AutomationTrigger
  condition: string
  action: AutomationAction
  params: string
  enabled: boolean
  last_run: string
  runs: number | null
}

export type Profile = {
  id: string
  display_name: string
  title: string
  bio: string
  avatar_color: string
  avatar_key: string
  start_page: string
}
