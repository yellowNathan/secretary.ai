import { useEffect, useMemo, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useCollection } from "@omg-dev/sdk"
import { AlertTriangle, Bell, BellRing, Play, RotateCcw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MembersOnly } from "@/components/members-only"
import type { Preferences } from "@/components/reminder-settings-sync"
import {
  defaultReminderSettings,
  describeLevel,
  parseReminderSettings,
  playRingtone,
  repeatOptions,
  ringtones,
  setReminderSettings,
  volumes,
  type LevelSettings,
  type PopupStyle,
  type ReminderSettings,
  type RingtoneId,
} from "@/lib/reminder-settings"
import type { Priority } from "@/lib/tasks"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export const Route = createFileRoute("/settings")({
  component: () => (
    <MembersOnly>
      <SettingsPage />
    </MembersOnly>
  ),
})

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

const levelInfo: Record<Priority, { title: string; hint: string; badge: string; border: string }> = {
  high: {
    title: "High priority",
    hint: "For deadlines you can't miss.",
    badge: "bg-destructive",
    border: "border-l-4 border-l-destructive",
  },
  medium: {
    title: "Medium priority",
    hint: "For everyday tasks.",
    badge: "bg-primary",
    border: "border-l-4 border-l-primary",
  },
  low: {
    title: "Low priority",
    hint: "For things that can wait.",
    badge: "bg-muted-foreground",
    border: "border-l-4 border-l-border",
  },
}

function SettingsPage() {
  const t = useT()
  const prefs = useCollection<Preferences>({ collection: "preferences", api: "/api/preferences" })
  const row = prefs.data[0]
  const saved = useMemo(() => parseReminderSettings(row?.reminders), [row?.reminders])
  const [draft, setDraft] = useState<ReminderSettings | null>(null)
  const [saving, setSaving] = useState(false)

  // Start editing from the saved settings once they've loaded.
  useEffect(() => {
    if (!prefs.loading && draft === null) setDraft(saved)
  }, [prefs.loading, saved, draft])

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)
  const isDefault = draft !== null && JSON.stringify(draft) === JSON.stringify(defaultReminderSettings)

  const setLevel = (p: Priority, patch: Partial<LevelSettings>) =>
    setDraft((d) => (d ? { ...d, levels: { ...d.levels, [p]: { ...d.levels[p], ...patch } } } : d))

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      const reminders = JSON.stringify(draft)
      if (row) await prefs.update(row.id, { reminders })
      else await prefs.create({ reminders })
      setReminderSettings(draft)
      toast.success(t("Settings saved"))
    } catch {
      toast.error(t("Couldn't save your settings. Please try again."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("Settings")}</h1>
        <p className="text-base text-muted-foreground">{t("Choose how reminders get your attention.")}</p>
      </header>

      {prefs.error ? (
        <Card className="flex flex-row items-start gap-3 p-4" role="alert">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-base">{t("Couldn't load your settings.")}</p>
            <Button variant="outline" className="h-11" onClick={() => void prefs.refresh?.()}>
              {t("Try again")}
            </Button>
          </div>
        </Card>
      ) : !draft ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <GeneralCard draft={draft} setDraft={setDraft} />

          <section aria-labelledby="by-priority" className="space-y-3">
            <div className="space-y-1">
              <h2 id="by-priority" className="text-xl font-semibold">{t("Ringtones by priority")}</h2>
              <p className="text-base text-muted-foreground">
                {t("Each task's priority decides which sound and alerts it uses.")}
              </p>
            </div>
            {(["high", "medium", "low"] as Priority[]).map((p) => (
              <LevelCard key={p} priority={p} level={draft.levels[p]} onChange={(patch) => setLevel(p, patch)} />
            ))}
          </section>

          {/* One main action, always in reach at the bottom of the screen. */}
          <div className="sticky bottom-0 z-30 -mx-4 border-t border-border bg-background/95 backdrop-blur sm:-mx-6">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
              <Button
                variant="ghost"
                className="h-11"
                disabled={isDefault || saving}
                onClick={() => setDraft(defaultReminderSettings)}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{t("Reset to defaults")}</span>
              </Button>
              <Button className="ml-auto h-11 min-w-0 flex-1 sm:flex-none sm:min-w-40" disabled={!dirty || saving} onClick={() => void save()}>
                <Save className="size-4" aria-hidden="true" /> {saving ? t("Saving…") : dirty ? t("Save settings") : t("Saved")}
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-4 py-1", disabled && "cursor-not-allowed opacity-60")}>
      <span className="min-w-0">
        <span className="block text-base">{label}</span>
        {hint && <span className="block text-sm text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} disabled={disabled} />
    </label>
  )
}

function GeneralCard({
  draft,
  setDraft,
}: {
  draft: ReminderSettings
  setDraft: (fn: (d: ReminderSettings | null) => ReminderSettings | null) => void
}) {
  const t = useT()
  const set = (patch: Partial<ReminderSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const supported = typeof window !== "undefined" && "Notification" in window
  const [permission, setPermission] = useState(supported ? Notification.permission : "unsupported")

  return (
    <Card className="gap-2 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <Bell className="size-5 text-primary" aria-hidden="true" /> {t("Reminder types")}
      </h2>
      <div className="divide-y divide-border">
        <SwitchRow
          label={t("Alerts")}
          hint={t("Sounds, pop-ups and notifications. When off, reminders still show in the list.")}
          checked={draft.alerts}
          onChange={(alerts) => set({ alerts })}
        />
        <SwitchRow
          label={t("Task reminders")}
          hint={t("Before a task's due date and time.")}
          checked={draft.tasks}
          onChange={(tasks) => set({ tasks })}
        />
        <SwitchRow
          label={t("Event reminders")}
          hint={t("Before a calendar event starts.")}
          checked={draft.events}
          onChange={(events) => set({ events })}
        />
        <div className="space-y-1.5 py-3">
          <label htmlFor="event-priority" className="block text-base">{t("Calendar events alert as")}</label>
          <select
            id="event-priority"
            className={selectClass}
            value={draft.eventPriority}
            disabled={!draft.events}
            onChange={(e) => set({ eventPriority: e.target.value as Priority })}
          >
            <option value="high">{t("High priority")}</option>
            <option value="medium">{t("Medium priority")}</option>
            <option value="low">{t("Low priority")}</option>
          </select>
        </div>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 pt-3">
          <span className="min-w-0">
            <span className="block text-base">{t("Device notifications")}</span>
            <span className="block text-sm text-muted-foreground">
              {permission === "granted"
                ? t("On for this device.")
                : permission === "denied"
                  ? t("Blocked. Allow notifications in your browser settings.")
                  : permission === "unsupported"
                    ? t("This browser doesn't support notifications.")
                    : t("Get alerts even when this tab is in the background.")}
            </span>
          </span>
          {permission === "default" && (
            <Button variant="outline" className="h-11" onClick={() => void Notification.requestPermission().then(setPermission)}>
              {t("Turn on notifications")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function LevelCard({
  priority,
  level,
  onChange,
}: {
  priority: Priority
  level: LevelSettings
  onChange: (patch: Partial<LevelSettings>) => void
}) {
  const t = useT()
  const info = levelInfo[priority]
  const id = (k: string) => `${priority}-${k}`
  const toneLabel = ringtones.find((r) => r.id === level.ringtone)?.label ?? "No sound"
  const silent = level.ringtone === "none"

  return (
    <Card className={cn("gap-4 p-4 sm:p-5", info.border)} aria-labelledby={id("title")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h3 id={id("title")} className="flex items-center gap-2 text-lg font-semibold">
            <span className={cn("size-3 rounded-full", info.badge)} aria-hidden="true" />
            {t(info.title)}
          </h3>
          <p className="text-sm text-muted-foreground">{t(info.hint)}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={id("tone")} className="block text-sm text-muted-foreground">{t("Ringtone")}</label>
          <div className="flex gap-2">
            <select
              id={id("tone")}
              className={selectClass}
              value={level.ringtone}
              onChange={(e) => {
                const ringtone = e.target.value as RingtoneId
                onChange({ ringtone })
                playRingtone(ringtone, level.volume)
              }}
            >
              {ringtones.map((r) => (
                <option key={r.id} value={r.id}>{t(r.label)}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0"
              disabled={silent}
              aria-label={t("Play {tone}", { tone: t(toneLabel) })}
              onClick={() => playRingtone(level.ringtone, level.volume)}
            >
              <Play className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span id={id("volume")} className="block text-sm text-muted-foreground">{t("Volume")}</span>
          <ToggleGroup
            aria-labelledby={id("volume")}
            variant="outline"
            className="grid w-full grid-cols-3"
            value={[String(nearestVolume(level.volume))]}
            onValueChange={(v: unknown[]) => {
              const next = Number(v[0])
              if (!next) return
              onChange({ volume: next })
              playRingtone(level.ringtone, next)
            }}
            disabled={silent}
          >
            {volumes.map((v) => (
              <ToggleGroupItem key={v.value} value={String(v.value)} className="h-11 w-full">
                {t(v.label)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={id("popup")} className="block text-sm text-muted-foreground">{t("Pop-up on screen")}</label>
          <select
            id={id("popup")}
            className={selectClass}
            value={level.popup}
            onChange={(e) => onChange({ popup: e.target.value as PopupStyle })}
          >
            <option value="stay">{t("Stays until I close it")}</option>
            <option value="brief">{t("Shows for a few seconds")}</option>
            <option value="off">{t("No pop-up")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={id("repeat")} className="block text-sm text-muted-foreground">{t("Repeat while overdue")}</label>
          <select
            id={id("repeat")}
            className={selectClass}
            value={level.repeat}
            onChange={(e) => onChange({ repeat: Number(e.target.value) })}
          >
            {repeatOptions.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? t("Don't repeat") : t("Every {n} min, 6 times", { n })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="divide-y divide-border border-t border-border">
        <SwitchRow
          label={t("Alert again when due")}
          hint={t("A second alert at the exact due time.")}
          checked={level.atDue}
          onChange={(atDue) => onChange({ atDue })}
        />
        <SwitchRow
          label={t("Vibrate")}
          hint={t("On phones that support it.")}
          checked={level.vibrate}
          onChange={(vibrate) => onChange({ vibrate })}
        />
        <SwitchRow
          label={t("Device notification")}
          hint={t("Shows in your device's notification list.")}
          checked={level.notify}
          onChange={(notify) => onChange({ notify })}
        />
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground" aria-live="polite">
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{describeLevel(level)}</span>
      </p>
    </Card>
  )
}

function nearestVolume(v: number): number {
  return volumes.reduce((best, x) => (Math.abs(x.value - v) < Math.abs(best - v) ? x.value : best), volumes[0].value as number)
}
