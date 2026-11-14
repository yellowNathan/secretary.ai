import { defineSchema, collection, fields } from "@omg-dev/schema"

export default defineSchema({
  collections: {
    columns: collection({
      fields: {
        name: fields.string(),
        position: fields.number(),
        done: fields.boolean(),
      },
    }),
    tasks: collection({
      fields: {
        title: fields.string(),
        project: fields.string(),
        // Holds the id of a column the user created.
        status: fields.string(),
        priority: fields.enum(["low", "medium", "high"]),
        due: fields.date(),
        notes: fields.string(),
        // Days before the due date to remind (0 = on the day), or -1 for none.
        // Older rows only; new rows use remind_before.
        remind_days: fields.number(),
        // Time of day the task is due, HH:MM or HH:MM:SS (empty = 09:00).
        due_time: fields.string(),
        // Seconds before the due moment to remind (0 = at the due time), -1 = none.
        remind_before: fields.number(),
      },
    }),
    events: collection({
      fields: {
        title: fields.string(),
        date: fields.date(),
        time: fields.string(),
        notes: fields.string(),
        // Days before the event to remind (0 = on the day), or -1 for none.
        // Older rows only; new rows use remind_before.
        remind_days: fields.number(),
        // Seconds before the event starts to remind (0 = at the start), -1 = none.
        remind_before: fields.number(),
        // How the event repeats: none, daily, weekly, monthly or yearly.
        repeat: fields.string(),
        // Last date the event repeats on (empty = forever).
        repeat_until: fields.string(),
      },
    }),
    automations: collection({
      fields: {
        name: fields.string(),
        // file_uploaded | task_created | task_done | schedule
        trigger: fields.string(),
        // JSON object, depends on the trigger
        condition: fields.string(),
        // convert_file | set_reminder | set_priority | create_task | notify
        action: fields.string(),
        // JSON object, depends on the action
        params: fields.string(),
        enabled: fields.boolean(),
        // YYYY-MM-DD of the last scheduled run
        last_run: fields.string(),
        runs: fields.number(),
      },
    }),
    profiles: collection({
      fields: {
        display_name: fields.string(),
        title: fields.string(),
        bio: fields.string(),
        // primary | secondary | accent | muted | foreground
        avatar_color: fields.string(),
        // storage key of the profile photo, if any
        avatar_key: fields.string(),
        // page to open after sign-in: home | board | calendar
        start_page: fields.string(),
        // Filled in on the sign-up form.
        first_name: fields.string(),
        last_name: fields.string(),
        username: fields.string(),
        phone: fields.string(),
        email: fields.string(),
      },
    }),
    // One row per person: their reminder settings as JSON.
    preferences: collection({
      fields: {
        reminders: fields.string(),
      },
    }),
    secretary_settings: collection({
      fields: {
        tone: fields.string(),
        length: fields.string(),
        default_bot: fields.string(),
        instructions: fields.string(),
        // forever, off, or retention period in days as an integer string.
        history_retention: fields.string(),
      },
    }),
    secretary_history: collection({
      fields: {
        bot: fields.string(),
        title: fields.string(),
        messages: fields.string(),
      },
    }),
    attachments: collection({
      fields: {
        // id of the task this file belongs to (empty for the Files library)
        task: fields.string(),
        // name of the original file when this one was made by a conversion
        converted_from: fields.string(),
        name: fields.string(),
        // storage key returned by the upload
        key: fields.string(),
        size: fields.number(),
      },
    }),
  },
})
