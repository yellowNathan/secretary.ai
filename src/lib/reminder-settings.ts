import { useSyncExternalStore } from "react"
import type { Priority } from "@/lib/tasks"
import { t } from "@/lib/i18n"

// Reminder settings belong to a signed-in person and are saved in their
// "preferences" row. Visitors (and the demo) always use the defaults.

export const ringtones = [
  { id: "alarm", label: "Alarm" },
  { id: "bell", label: "Bell" },
  { id: "chime", label: "Chime" },
  { id: "digital", label: "Digital" },
  { id: "marimba", label: "Marimba" },
  { id: "pulse", label: "Pulse" },
  { id: "none", label: "No sound" },
] as const
export type RingtoneId = (typeof ringtones)[number]["id"]

export const volumes = [
  { value: 35, label: "Soft" },
  { value: 65, label: "Medium" },
  { value: 100, label: "Loud" },
] as const

export type PopupStyle = "stay" | "brief" | "off"

export const repeatOptions = [0, 5, 10, 15, 30, 60] as const

export type LevelSettings = {
  ringtone: RingtoneId
  /** 0–100 */
  volume: number
  /** stay = until closed, brief = a few seconds, off = no pop-up */
  popup: PopupStyle
  vibrate: boolean
  /** Device notification (needs permission) */
  notify: boolean
  /** Alert again at the exact due moment */
  atDue: boolean
  /** Minutes between repeats while overdue (6 repeats), 0 = off */
  repeat: number
}

export type ReminderSettings = {
  /** Sounds, pop-ups and notifications on/off. The list still shows when off. */
  alerts: boolean
  tasks: boolean
  events: boolean
  /** Which priority calendar events alert with */
  eventPriority: Priority
  levels: Record<Priority, LevelSettings>
}

export const defaultReminderSettings: ReminderSettings = {
  alerts: true,
  tasks: true,
  events: true,
  eventPriority: "medium",
  levels: {
    high: { ringtone: "alarm", volume: 100, popup: "stay", vibrate: true, notify: true, atDue: true, repeat: 10 },
    medium: { ringtone: "chime", volume: 65, popup: "brief", vibrate: false, notify: true, atDue: true, repeat: 0 },
    low: { ringtone: "none", volume: 35, popup: "brief", vibrate: false, notify: true, atDue: false, repeat: 0 },
  },
}

const PRIORITIES: Priority[] = ["high", "medium", "low"]

/** Reads saved JSON, filling anything missing or invalid with the defaults. */
export function parseReminderSettings(json?: string | null): ReminderSettings {
  let raw: Partial<ReminderSettings> = {}
  try {
    raw = json ? JSON.parse(json) : {}
  } catch {
    raw = {}
  }
  const d = defaultReminderSettings
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb)
  const levels = {} as Record<Priority, LevelSettings>
  for (const p of PRIORITIES) {
    const r = (raw.levels?.[p] ?? {}) as Partial<LevelSettings>
    const fb = d.levels[p]
    levels[p] = {
      ringtone: ringtones.some((x) => x.id === r.ringtone) ? (r.ringtone as RingtoneId) : fb.ringtone,
      volume: typeof r.volume === "number" ? Math.min(100, Math.max(0, r.volume)) : fb.volume,
      popup: r.popup === "stay" || r.popup === "brief" || r.popup === "off" ? r.popup : fb.popup,
      vibrate: bool(r.vibrate, fb.vibrate),
      notify: bool(r.notify, fb.notify),
      atDue: bool(r.atDue, fb.atDue),
      repeat: typeof r.repeat === "number" && r.repeat >= 0 ? r.repeat : fb.repeat,
    }
  }
  return {
    alerts: bool(raw.alerts, d.alerts),
    tasks: bool(raw.tasks, d.tasks),
    events: bool(raw.events, d.events),
    eventPriority: PRIORITIES.includes(raw.eventPriority as Priority) ? (raw.eventPriority as Priority) : d.eventPriority,
    levels,
  }
}

// ── Shared store ────────────────────────────────────────────────────────────

let current: ReminderSettings = defaultReminderSettings
const listeners = new Set<() => void>()

export function getReminderSettings(): ReminderSettings {
  return current
}

export function setReminderSettings(next: ReminderSettings) {
  current = next
  listeners.forEach((l) => l())
}

export function useReminderSettings(): ReminderSettings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => current,
    () => current,
  )
}

/** "Alarm · Pop-up stays · Vibrates · Repeats every 10 min" */
export function describeLevel(l: LevelSettings): string {
  const tone = ringtones.find((r) => r.id === l.ringtone)?.label ?? "No sound"
  const parts = [t(tone)]
  parts.push(t(l.popup === "stay" ? "Pop-up stays" : l.popup === "brief" ? "Brief pop-up" : "No pop-up"))
  if (l.vibrate) parts.push(t("Vibrates"))
  if (l.notify) parts.push(t("Device notification"))
  if (l.atDue) parts.push(t("Again when due"))
  if (l.repeat > 0) parts.push(t("Repeats every {n} min", { n: l.repeat }))
  return parts.join(" · ")
}

// ── Ringtones ───────────────────────────────────────────────────────────────
// Synthesised with the Web Audio API, so there are no sound files to load.

type Note = { f: number; to?: number; at: number; d: number; type: OscillatorType; g: number }

const TONES: Record<Exclude<RingtoneId, "none">, Note[]> = {
  alarm: [0, 0.25, 0.5, 1, 1.25, 1.5].map((at) => ({ f: 988, at, d: 0.16, type: "square" as const, g: 0.45 })),
  bell: [
    { f: 1318.5, at: 0, d: 1.4, type: "sine", g: 0.8 },
    { f: 659.25, at: 0, d: 1.6, type: "sine", g: 0.45 },
    { f: 1318.5, at: 0.7, d: 1.4, type: "sine", g: 0.6 },
    { f: 659.25, at: 0.7, d: 1.6, type: "sine", g: 0.35 },
  ],
  chime: [
    { f: 784, at: 0, d: 0.3, type: "triangle", g: 0.8 },
    { f: 1046.5, at: 0.14, d: 0.5, type: "triangle", g: 0.8 },
  ],
  digital: [0, 0.12, 0.5, 0.62].map((at) => ({ f: 1760, at, d: 0.08, type: "square" as const, g: 0.3 })),
  marimba: [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ f, at: i * 0.13, d: 0.4, type: "sine" as const, g: 0.85 })),
  pulse: [0, 0.35, 0.7].map((at) => ({ f: 440, to: 330, at, d: 0.25, type: "sawtooth" as const, g: 0.3 })),
}

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {})
  return ctx
}

/** Plays a ringtone at a volume from 0 to 100. Never throws. */
export function playRingtone(id: RingtoneId, volume: number) {
  if (id === "none" || volume <= 0) return
  const c = audio()
  if (!c) return
  const master = (volume / 100) * 0.35
  const start = c.currentTime + 0.02
  try {
    for (const n of TONES[id]) {
      const osc = c.createOscillator()
      const amp = c.createGain()
      const t0 = start + n.at
      const t1 = t0 + n.d
      osc.type = n.type
      osc.frequency.setValueAtTime(n.f, t0)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t1)
      amp.gain.setValueAtTime(0.0001, t0)
      amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, n.g * master), t0 + 0.01)
      amp.gain.exponentialRampToValueAtTime(0.0001, t1)
      osc.connect(amp).connect(c.destination)
      osc.start(t0)
      osc.stop(t1 + 0.05)
    }
  } catch {
    // The audio context can be closed underneath us; stay silent.
  }
}
