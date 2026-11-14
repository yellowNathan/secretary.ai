// useSound / playSound — the AUDIO half of the delight kit (its haptic-ish
// sibling to the visual `transitions` / `AnimatedNumber` primitives).
//
// Every sound is SYNTHESIZED at runtime with the Web Audio API — there are no
// `.mp3`/`.wav` files to ship, fetch, or decode. The whole thing is a few
// oscillators and a gain envelope, so it adds ~0kb of assets and a couple kb of
// code, and it themes to nothing (pure tones) so it drops into any app.
//
// Design rules baked in, so a button that opts into sound never feels cheap:
//   - One shared, lazily-created AudioContext, resumed on the first gesture.
//     Browsers block audio until a user interaction, and a button press IS one,
//     so the first click both unlocks and plays.
//   - Silently no-ops when Web Audio is unavailable (SSR, old browsers) or when
//     sound is disabled — exactly like the haptics singleton. It never throws.
//   - Respects `prefers-reduced-motion`: a user who asked for a calmer, quieter
//     experience gets silence unless the app explicitly forces sound on.
//   - Short, quiet, rounded envelopes (soft attack + exponential release) so
//     presses read as a tactile "tick", never a harsh beep.
//
// Self-contained: no CSS, no Tailwind, no runtime dependency beyond React.
// Edit the PRESETS table freely — it's vendored into your project.

import { useCallback, useMemo } from "react"

/** Built-in synthesized sounds. Pass one of these names to `play`. */
export type SoundName =
  | "tap" // soft, short press tick — the default for buttons
  | "click" // crisper, slightly louder press
  | "toggleOn" // rising two-tone — switch/checkbox turning on
  | "toggleOff" // falling two-tone — switch/checkbox turning off
  | "success" // pleasant rising major third — save/confirm
  | "error" // low, buzzy descending — invalid/destructive
  | "notify" // gentle two-note chime — a new item/notification

type Tone = {
  /** Oscillator frequency in Hz (or the START of a glide, with `to`). */
  freq: number
  /** Optional glide target — the pitch ramps from `freq` to `to`. */
  to?: number
  /** How long the tone rings, in seconds. */
  duration: number
  /** Peak gain (0–1). Kept low so sounds stay tactile, not startling. */
  gain?: number
  /** Oscillator shape. `sine`/`triangle` are soft; `square`/`sawtooth` bite. */
  type?: OscillatorType
  /** Delay before this tone starts, in seconds (for two-note sequences). */
  delay?: number
}

// Each preset is one or more tones layered/sequenced. Frequencies are chosen
// to sit in a musical relationship (unison, thirds, fifths) so multi-tone
// sounds read as "nice" rather than random.
const PRESETS: Record<SoundName, Tone[]> = {
  tap: [{ freq: 660, duration: 0.05, gain: 0.05, type: "sine" }],
  click: [{ freq: 880, duration: 0.045, gain: 0.07, type: "triangle" }],
  toggleOn: [
    { freq: 587.33, duration: 0.06, gain: 0.05, type: "sine" },
    { freq: 880, duration: 0.07, gain: 0.05, type: "sine", delay: 0.045 },
  ],
  toggleOff: [
    { freq: 880, duration: 0.06, gain: 0.05, type: "sine" },
    { freq: 587.33, duration: 0.07, gain: 0.05, type: "sine", delay: 0.045 },
  ],
  success: [
    { freq: 523.25, duration: 0.08, gain: 0.05, type: "sine" },
    { freq: 659.25, duration: 0.12, gain: 0.05, type: "sine", delay: 0.07 },
  ],
  error: [{ freq: 200, to: 120, duration: 0.16, gain: 0.06, type: "sawtooth" }],
  notify: [
    { freq: 784, duration: 0.08, gain: 0.045, type: "triangle" },
    { freq: 1046.5, duration: 0.12, gain: 0.045, type: "triangle", delay: 0.06 },
  ],
}

let ctx: AudioContext | null = null
let enabled = true

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctor) return null
  if (!ctx) {
    try {
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  // A context created before a gesture starts `suspended`; a gesture-driven
  // call resumes it. Fire-and-forget — if it's blocked, playback just no-ops.
  if (ctx.state === "suspended") void ctx.resume().catch(() => {})
  return ctx
}

function ring(context: AudioContext, tone: Tone, startAt: number) {
  const osc = context.createOscillator()
  const amp = context.createGain()
  const peak = tone.gain ?? 0.05
  const t0 = startAt + (tone.delay ?? 0)
  const t1 = t0 + tone.duration

  osc.type = tone.type ?? "sine"
  osc.frequency.setValueAtTime(tone.freq, t0)
  if (tone.to != null) osc.frequency.exponentialRampToValueAtTime(tone.to, t1)

  // Soft attack, exponential release — a rounded "tick", not a click artifact.
  amp.gain.setValueAtTime(0.0001, t0)
  amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.008)
  amp.gain.exponentialRampToValueAtTime(0.0001, t1)

  osc.connect(amp).connect(context.destination)
  osc.start(t0)
  osc.stop(t1 + 0.02)
}

/**
 * Play a synthesized sound. Safe to call anywhere: silently no-ops on unsupported
 * platforms, when sound is disabled, or under `prefers-reduced-motion`. Best
 * called from within a user gesture (a click/press handler) so the browser lets
 * audio through.
 *
 * You can also pass an ad-hoc tone (or array of tones) instead of a preset name
 * to synthesize a one-off sound.
 */
export function playSound(sound: SoundName | Tone | Tone[]): void {
  if (!enabled || prefersReducedMotion()) return
  const context = getContext()
  if (!context) return
  const tones =
    typeof sound === "string" ? PRESETS[sound] : Array.isArray(sound) ? sound : [sound]
  if (!tones || tones.length === 0) return
  const now = context.currentTime
  try {
    for (const tone of tones) ring(context, tone, now)
  } catch {
    // AudioContext can throw if it was closed out from under us — ignore.
  }
}

/**
 * Globally enable or disable all synthesized sound (e.g. a settings toggle).
 * Defaults to enabled. Disabling makes every `playSound`/`useSound().play` a
 * no-op without changing any call sites.
 */
export function setSoundEnabled(next: boolean): void {
  enabled = next
}

/** Whether synthesized sound is currently enabled (ignores reduced-motion). */
export function isSoundEnabled(): boolean {
  return enabled
}

/**
 * Hook wrapper. Returns a stable `play` you can drop into event handlers, plus
 * the enable/disable controls. `play` defaults to the `"tap"` press tick.
 *
 * ```tsx
 * const { play } = useSound()
 * <Button onClick={() => { play("success"); save() }}>Save</Button>
 * ```
 */
export function useSound() {
  const play = useCallback((sound: SoundName | Tone | Tone[] = "tap") => {
    playSound(sound)
  }, [])
  return useMemo(
    () => ({ play, setEnabled: setSoundEnabled, isEnabled: isSoundEnabled }),
    [play],
  )
}
